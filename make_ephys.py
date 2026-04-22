import argparse
import json
import random
import sys
import uuid
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from iblatlas.regions import BrainRegions
from tqdm.auto import tqdm

# Allow importing ephysatlas from the adjacent ibleatools checkout when this
# repo is executed standalone.
IBLEATOOLS_SRC = (Path(__file__).resolve().parent / "../ibleatools/src").resolve()
if str(IBLEATOOLS_SRC) not in sys.path:
    sys.path.insert(0, str(IBLEATOOLS_SRC))
IBLBRAINVIEWER_ROOT = (Path(__file__).resolve().parent / "../iblbrainviewer").resolve()
if str(IBLBRAINVIEWER_ROOT) not in sys.path:
    sys.path.insert(0, str(IBLBRAINVIEWER_ROOT))

from brainbox.io.one import SpikeSortingLoader
from ephysatlas.data import atlas_pids, read_features_from_disk
from ephysatlas.features import voltage_features_set
from iblbrainviewer import api
from one.api import ONE

from tools.ephys_units import (
    get_ephys_cluster_feature_unit,
    get_ephys_feature_unit,
)


N_BINS = 50
HISTOGRAM_QUANTILE = 0.001
DEFAULT_PROJECT = "ibl_neuropixel_brainwide_01"
DEFAULT_AGG_PROJECT = "ea_active"
DEFAULT_AGG_LEVEL = "agg_full"
ROOT_DIR = Path(__file__).resolve().parent
FEATURES_DIR = ROOT_DIR / "data/features"
CLUSTER_CACHE_DIRNAME = "clusters_full"
CLUSTER_FEATURES = (
    "amp_max",
    "amp_min",
    "amp_median",
    "amp_std_dB",
    "contamination",
    "contamination_alt",
    "drift",
    "missed_spikes_est",
    "noise_cutoff",
    "presence_ratio",
    "presence_ratio_std",
    "slidingRP_viol",
    "spike_count",
    "firing_rate",
)
XLIMS = {
    "alpha_mean": (30, 160),
    "alpha_std": (0, 100),
    "amp_std_dB": (0, 20),
    "contamination": (0, 1),
    "contamination_alt": (0, 1),
    "cor_ratio": (0, 1),
    "depolarisation_slope": (0, 6e3),
    "drift": (0, 2e4),
    "firing_rate": (0, 40),
    "missed_spikes_est": (0, 1),
    "noise_cutoff": (0, 50),
    "peak_time_secs": (-0.5e-5, +1e-5),
    "peak_val": (-6, 2),
    "polarity": (-1, 0.4),
    "presence_ratio": (0, 1),
    "psd_alpha_csd": (-220, -180),
    "psd_alpha": (-120, -80),
    "psd_beta_csd": (-220, -180),
    "psd_beta": (-120, -80),
    "psd_delta_csd": (-220, -180),
    "psd_delta": (-120, -80),
    "psd_gamma_csd": (-220, -180),
    "psd_gamma": (-120, -80),
    "psd_lfp_csd": (-220, -180),
    "psd_lfp": (-120, -80),
    "psd_theta_csd": (-220, -180),
    "psd_theta": (-120, -80),
    "recovery_slope": (-6e3, 2e3),
    "recovery_time_secs": (4e-4, 8e-4),
    "repolarisation_slope": (-1e4, 4e4),
    "rms_lf_csd": (0.1e-8, 1e-8),
    "slidingRP_viol": (0, 1),
    "spike_count": (0, 5e4),
    "tip_time_secs": (-6e-4, -2e-4),
    "tip_val": (-0.5, 1),
    "trough_time_secs": (2.5e-4, 6e-4),
    "trough_val": (-0.5, 3),
}


def get_feature_unit(fname, bucket_alias="ephys"):
    if bucket_alias == "ephys_clusters":
        return get_ephys_cluster_feature_unit(fname)
    return get_ephys_feature_unit(fname)


def save_json(d, filename):
    with open(filename, "w") as f:
        json.dump(d, f, indent=1, sort_keys=True)


def log_step(message):
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] {message}", flush=True)


def now():
    return datetime.now().isoformat()


def multiple_file_types(patterns):
    for pattern in patterns:
        yield from FEATURES_DIR.glob(pattern)


def get_bucket_path(uuid_or_alias):
    patterns = (f"{uuid_or_alias}_*", f"*_{uuid_or_alias}", uuid_or_alias)
    filenames = list(multiple_file_types(patterns))
    if not filenames:
        return None
    return filenames[0]


def load_bucket_metadata(uuid_or_alias):
    path = get_bucket_path(uuid_or_alias)
    if not path:
        return None
    metadata_path = path / "_bucket.json"
    if not metadata_path.exists():
        return None
    return json.loads(metadata_path.read_text())


def new_uuid():
    return str(uuid.UUID(int=random.getrandbits(128)))[:18]


def lateralize_features(df):
    for c in df.columns:
        if c.startswith("atlas_id"):
            df[c] = -df[c].abs()
    return df


def get_histogram_groupby(df, n_bins=N_BINS):
    out = {}
    feature_names = df.obj.select_dtypes(include=[np.number]).columns
    bin_edges = {}
    q = HISTOGRAM_QUANTILE
    for fname in feature_names:
        values = df.obj[fname].dropna()
        if values.empty:
            bin_edges[fname] = np.linspace(0, 1, n_bins + 1)
            continue
        vmin, vmax = XLIMS.get(fname, (values.quantile(q), values.quantile(1 - q)))
        if vmin == vmax:
            vmax = vmin + 1
        bin_edges[fname] = np.histogram_bin_edges(values, range=(vmin, vmax), bins=n_bins)

    group_hist_data = {bin_idx: {} for bin_idx in range(n_bins)}
    for group_name, group_df in df:
        for col in feature_names:
            counts, _ = np.histogram(group_df[col].dropna(), bins=bin_edges[col])
            for bin_idx in range(n_bins):
                if group_name not in group_hist_data[bin_idx]:
                    group_hist_data[bin_idx][group_name] = {}
                group_hist_data[bin_idx][group_name][col] = counts[bin_idx]

    for bin_idx in range(n_bins):
        v = pd.DataFrame.from_dict(group_hist_data[bin_idx], orient="index").astype(np.int32)
        out[f"h_{bin_idx:03}"] = v

    return out, bin_edges


def get_uncertainty(df):
    q5 = df.quantile(0.05)
    q95 = df.quantile(0.95)
    median = df.median()
    mean = df.mean()

    ci_width = q95 - q5
    uncertainty = (median - mean) / ci_width
    uncertainty[np.isnan(uncertainty)] = 0
    return uncertainty


def get_aggregates(df):
    out = {
        "mean": df.mean(numeric_only=True),
        "median": df.median(numeric_only=True),
        "std": df.std(ddof=0, numeric_only=True),
        "min": df.min(),
        "max": df.max(),
        "count": df.count().astype(np.int32),
    }
    out["uncertainty"] = get_uncertainty(df)
    hist, bin_edges = get_histogram_groupby(df, n_bins=N_BINS)
    out.update(hist)
    return out, bin_edges


def clean(payload):
    if not isinstance(payload, dict):
        return payload
    cleaned = {}
    for key, value in payload.items():
        if isinstance(value, dict):
            value = clean(value)
        if isinstance(value, float) and value.is_integer():
            value = int(value)
        if isinstance(key, str) and key.startswith("h_") and value == 0:
            continue
        if isinstance(value, (list, np.ndarray)):
            value = [clean(v) for v in value]
        cleaned[key] = value
    return cleaned


def ensure_bucket(alias, short_desc):
    metadata = load_bucket_metadata(alias)
    if metadata:
        bucket_uuid = metadata["uuid"]
        output_dir = FEATURES_DIR / f"{alias}_{bucket_uuid}"
        output_dir.mkdir(parents=True, exist_ok=True)
        return bucket_uuid, output_dir

    bucket_uuid = new_uuid()
    output_dir = FEATURES_DIR / f"{alias}_{bucket_uuid}"
    output_dir.mkdir(parents=True, exist_ok=True)
    metadata = {
        "uuid": bucket_uuid,
        "alias": alias,
        "url": None,
        "tree": None,
        "short_desc": short_desc,
        "long_desc": None,
        "token": str(uuid.UUID(int=random.getrandbits(128))),
        "last_access_date": now(),
    }
    save_json(metadata, output_dir / "_bucket.json")
    return bucket_uuid, output_dir


def prepare_region_dataframe(df, feature_names):
    br = BrainRegions()
    df = df.copy()
    missing = [col for col in ("atlas_id", "acronym") if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns for regional aggregation: {missing}")

    available_features = [fname for fname in feature_names if fname in df.columns]
    missing_features = sorted(set(feature_names) - set(available_features))
    if missing_features:
        print(f"Skipping missing features: {', '.join(missing_features)}")
    if not available_features:
        raise ValueError("No requested features are available in the dataframe")

    df["atlas_id"] = pd.to_numeric(df["atlas_id"], errors="coerce")
    df = df.dropna(subset=["atlas_id"])
    df["atlas_id"] = df["atlas_id"].astype(np.int32)
    df["atlas_idx"] = np.array([_[0] for _ in br.id2index(df.atlas_id)[1]], dtype=np.int32)
    df = lateralize_features(df)
    df = df[~df["acronym"].isin(["void", "root"])].copy()
    return df, available_features


def make_region_bucket_from_df(
    df,
    feature_names,
    output_dir,
    bucket_alias="ephys",
    short_desc_prefix="Ephys atlas feature",
    key="mean",
    n_jobs=1,
):
    hemisphere = "left"
    log_step(f"Preparing dataframe for bucket `{bucket_alias}`")
    df, feature_names = prepare_region_dataframe(df, feature_names)
    log_step(
        f"Prepared {len(df):,} rows across {df['atlas_idx'].nunique():,} atlas regions; "
        f"{len(feature_names)} features to write"
    )
    print("Feature names:", ", ".join(feature_names), flush=True)

    log_step("Computing grouped regional aggregates")
    df_grouped = df[feature_names + ["atlas_id", "atlas_idx"]].groupby("atlas_idx")
    agg, _ = get_aggregates(df_grouped)
    df_values = agg[key]
    atlas_ids = df_values["atlas_id"]
    agg.pop(key)
    df_extra_values = agg

    def remap(stat, vs):
        agg_kind = "sum" if stat in ("count",) or stat.startswith("h_") else "mean"
        return api.make_features(atlas_ids, vs, hemisphere=hemisphere, agg=agg_kind)

    def process_fname(fname):
        values = df_values[fname]
        q = HISTOGRAM_QUANTILE
        vmin, vmax = XLIMS.get(fname, (values.quantile(q), values.quantile(1 - q)))
        if vmin == vmax:
            vmax = vmin + 1

        data = remap(key, values)
        extra_values = {
            stat: remap(stat, df_extra_values[stat][fname].values)
            for stat in df_extra_values.keys()
        }

        payload = api.make_features_payload(
            fname,
            data,
            short_desc=f"{short_desc_prefix}: {fname}",
            key=key,
            extra_values=extra_values,
        )
        payload["unit"] = get_feature_unit(fname, bucket_alias=bucket_alias)
        api.add_payload_histogram(payload, df[fname], vmin, vmax)
        payload = clean(payload)
        api.save_payload(output_dir, fname, payload)

    if n_jobs != 1:
        log_step(
            f"Progress reporting is most reliable in sequential mode; writing features with n_jobs=1 "
            f"(requested n_jobs={n_jobs})"
        )
    log_step(f"Writing {len(feature_names)} feature payloads to {output_dir}")
    for fname in tqdm(feature_names, desc=f"{bucket_alias}: features", unit="feature"):
        process_fname(fname)
    log_step(f"Finished writing feature payloads for `{bucket_alias}`")
    return df


def make_ephys_data(local_data_path, output_dir=None, short_desc=None, key="mean", n_jobs=1):
    df_voltage = read_features_from_disk(local_data_path)
    return make_region_bucket_from_df(
        df_voltage,
        voltage_features_set(),
        output_dir=output_dir,
        bucket_alias="ephys",
        short_desc_prefix=short_desc or "Ephys atlas feature",
        key=key,
        n_jobs=n_jobs,
    )


def get_project_pids(one, project=DEFAULT_PROJECT, tracing=True):
    pids, _ = atlas_pids(one, tracing=tracing, project=project)
    return pids


def load_clusters_dataframe(
    one,
    pids,
    cache_root,
    recompute_metrics=False,
    spike_sorter="iblsorter",
):
    cache_root = Path(cache_root)
    cache_root.mkdir(parents=True, exist_ok=True)
    dfs = []
    stats = {"cached": 0, "computed": 0, "skipped": 0}

    log_step(f"Loading cluster data for {len(pids):,} insertions into cache {cache_root}")
    pbar = tqdm(pids, desc="ephys_clusters: pids", unit="pid")
    for pid in pbar:
        probe_cache_dir = cache_root / pid
        probe_cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file = probe_cache_dir / "clusters.pqt"

        if cache_file.exists() and not recompute_metrics:
            df = pd.read_parquet(cache_file)
            stats["cached"] += 1
            source = "cached"
        else:
            ssl = SpikeSortingLoader(pid=pid, one=one)
            spikes, clusters, channels = ssl.load_spike_sorting(spike_sorter=spike_sorter)
            if not clusters or not channels:
                stats["skipped"] += 1
                pbar.write(f"Skipping {pid}: missing clusters or channels")
                continue
            merged = ssl.merge_clusters(
                spikes,
                clusters,
                channels,
                cache_dir=probe_cache_dir,
                compute_metrics=recompute_metrics,
            )
            if merged is None:
                stats["skipped"] += 1
                pbar.write(f"Skipping {pid}: no merged clusters")
                continue
            df = pd.DataFrame(merged)
            if not cache_file.exists():
                df.to_parquet(cache_file)
            stats["computed"] += 1
            source = "computed"

        if "pid" not in df.columns:
            df["pid"] = pid
        dfs.append(df)
        pbar.set_postfix(
            rows=f"{sum(len(d) for d in dfs):,}",
            cached=stats["cached"],
            computed=stats["computed"],
            source=source,
        )

    if not dfs:
        raise RuntimeError("No cluster dataframes could be loaded")
    log_step(
        f"Loaded {len(dfs):,} pid tables ({stats['cached']} cached, {stats['computed']} computed, "
        f"{stats['skipped']} skipped)"
    )
    return pd.concat(dfs, ignore_index=True)


def make_ephys_clusters_data(
    one,
    output_dir,
    cache_root,
    project=DEFAULT_PROJECT,
    tracing=True,
    recompute_metrics=False,
    spike_sorter="iblsorter",
    key="mean",
    n_jobs=1,
):
    log_step(f"Enumerating atlas insertions for project `{project}`")
    pids = get_project_pids(one, project=project, tracing=tracing)
    log_step(f"Found {len(pids):,} insertions")
    df_clusters = load_clusters_dataframe(
        one=one,
        pids=pids,
        cache_root=cache_root,
        recompute_metrics=recompute_metrics,
        spike_sorter=spike_sorter,
    )

    keep = ["pid", "atlas_id", "acronym", *CLUSTER_FEATURES]
    available = [col for col in keep if col in df_clusters.columns]
    df_clusters = df_clusters[available].copy()
    log_step(
        f"Cluster dataframe ready: {len(df_clusters):,} rows, {df_clusters['pid'].nunique():,} pids, "
        f"{len(available) - 3} feature columns"
    )
    return make_region_bucket_from_df(
        df_clusters,
        CLUSTER_FEATURES,
        output_dir=output_dir,
        bucket_alias="ephys_clusters",
        short_desc_prefix="Ephys cluster feature",
        key=key,
        n_jobs=n_jobs,
    )


def plot_distributions(pqt_path, channels_path):
    df_voltage = pd.read_parquet(pqt_path)

    br = BrainRegions()
    df_channels = pd.read_parquet(channels_path)

    df_voltage["atlas_id"] = df_channels["atlas_id"].astype(np.int32)
    df_voltage["atlas_idx"] = np.array(
        [_[0] for _ in br.id2index(df_voltage.atlas_id)[1]], dtype=np.int32
    )
    df_voltage = lateralize_features(df_voltage)

    for fname in ("alpha_std",):
        values = df_voltage[fname]
        vmin, vmax = XLIMS.get(fname)
        plt.hist(values, bins=np.linspace(vmin, vmax, 100))
        plt.title(fname)
        plt.show()


def make_volumes(mean_path, std_path, output_dir):
    up = api.FeatureUploader()
    means = np.load(mean_path, mmap_mode="r")
    stds = np.load(std_path, mmap_mode="r")

    n = means.shape[-1]
    for i in range(n):
        mean = means[..., i]
        std = stds[..., i]
        data = {"mean": mean, "std": std}
        up.local_volume(f"yanliang_volume_{i:04d}", data, output_dir=output_dir)


def parse_args():
    parser = argparse.ArgumentParser(description="Generate ephys feature buckets for atlas")
    parser.add_argument(
        "--bucket",
        choices=("ephys", "ephys_clusters"),
        default="ephys_clusters",
        help="Bucket to generate",
    )
    parser.add_argument("--label", default="2025_W52", help="Feature label for channel-level ephys cache path")
    parser.add_argument(
        "--agg-project",
        default=DEFAULT_AGG_PROJECT,
        help="Project name used for cached channel-level aggregated ephys tables",
    )
    parser.add_argument(
        "--agg-level",
        default=DEFAULT_AGG_LEVEL,
        help="Aggregation level used for cached channel-level ephys tables",
    )
    parser.add_argument(
        "--ibl-project",
        default=DEFAULT_PROJECT,
        help="Alyx project used to enumerate atlas insertions for cluster bucket generation",
    )
    parser.add_argument(
        "--cache-root",
        default=str((Path(__file__).resolve().parent / "../ibleatools/temp").resolve()),
        help="Base cache directory for local ephys exports and per-pid cluster caches",
    )
    parser.add_argument("--n-jobs", type=int, default=12)
    parser.add_argument("--key", default="mean")
    parser.add_argument("--spike-sorter", default="iblsorter")
    parser.add_argument("--recompute-metrics", action="store_true")
    parser.add_argument("--no-tracing", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    cache_root = Path(args.cache_root).resolve()

    if args.bucket == "ephys":
        log_step("Generating existing `ephys` bucket")
        _, output_dir = ensure_bucket("ephys", "Ephys atlas")
        local_data_path = cache_root / args.agg_project / args.label / args.agg_level
        if not local_data_path.exists():
            raise FileNotFoundError(f"Channel-level ephys cache not found: {local_data_path}")
        make_ephys_data(local_data_path, output_dir=output_dir, key=args.key, n_jobs=args.n_jobs)
        log_step(f"`ephys` generation complete: {output_dir}")
        return

    log_step("Generating new `ephys_clusters` bucket")
    _, output_dir = ensure_bucket("ephys_clusters", "Ephys atlas clusters")
    one = ONE()
    cluster_cache_root = cache_root / args.ibl_project / args.label / CLUSTER_CACHE_DIRNAME
    make_ephys_clusters_data(
        one=one,
        output_dir=output_dir,
        cache_root=cluster_cache_root,
        project=args.ibl_project,
        tracing=not args.no_tracing,
        recompute_metrics=args.recompute_metrics,
        spike_sorter=args.spike_sorter,
        key=args.key,
        n_jobs=args.n_jobs,
    )
    log_step(f"`ephys_clusters` generation complete: {output_dir}")


if __name__ == "__main__":
    main()
