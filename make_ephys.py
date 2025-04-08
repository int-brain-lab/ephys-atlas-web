# ---------------------------------------------------------------------------------------------
# Imports
# ---------------------------------------------------------------------------------------------

import json
from pathlib import Path
from pprint import pprint
import tqdm

from joblib import Parallel, delayed
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt


from pathlib import Path
import numpy as np
import pandas as pd
from ephys_atlas.features import voltage_features_set
from ephys_atlas.data import load_voltage_features
from iblatlas.regions import BrainRegions
from iblbrainviewer import api


# ---------------------------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------------------------

N_BINS = 50
HISTOGRAM_QUANTILE = .001  # fallback if the fname does not exist in XLIMS below
XLIMS = {
    "alpha_mean": (30, 160),
    "alpha_std": (0, 100),
    "cor_ratio": (0, 1),
    "depolarisation_slope": (0, 6e3),
    "peak_time_secs": (-.5e-5, +1e-5),
    "peak_val": (-6, 2),
    "polarity": (-1, .4),
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
    "recovery_slope": (-6e+3, 2e3),
    "recovery_time_secs": (4e-4, 8e-4),
    "repolarisation_slope": (-1e+4, 4e4),
    "rms_ap": (.5e-5, 4e-5),
    "rms_lf": (0.5e-4, 1.5e-4),
    "rms_lf_csd": (0.1e-8, 1e-8),
    "spike_count": (0, 200),
    "tip_time_secs": (-6e-4, -2e-4),
    "tip_val": (-.5, 1),
    "trough_time_secs": (2.5e-4, 6e-4),
    "trough_val": (-.5, 3),
}


# ---------------------------------------------------------------------------------------------
# Utils
# ---------------------------------------------------------------------------------------------

def save_json(d, filename):
    with open(filename, "w") as f:
        json.dump(d, f, indent=1, sort_keys=True)


def lateralize_features(df):
    for c in df.columns:
        if c.startswith('atlas_id'):
            df[c] = -df[c].abs()
    return df


def get_histogram_groupby(df, n_bins=N_BINS):
    out = {}

    # Get numeric columns
    feature_names = df.obj.select_dtypes(include=[np.number]).columns

    # Compute bin edges based on the full dataset (ensuring consistent bins across groups)
    bin_edges = {}
    q = HISTOGRAM_QUANTILE
    for fname in feature_names:
        values = df.obj[fname].dropna()
        vmin, vmax = XLIMS.get(fname, (values.quantile(q), values.quantile(1 - q)))
        bin_edges[fname] =  np.histogram_bin_edges(values, range=(vmin, vmax), bins=n_bins)

    # Prepare a dictionary to store group-wise histograms
    group_hist_data = {bin_idx: {} for bin_idx in range(n_bins)}

    # Iterate over groups
    for group_name, group_df in df:
        for col in feature_names:
            # Compute histogram counts for this column in this group
            counts, _ = np.histogram(group_df[col].dropna(), bins=bin_edges[col])

            # Store counts in the corresponding bin index
            for bin_idx in range(n_bins):
                if group_name not in group_hist_data[bin_idx]:
                    group_hist_data[bin_idx][group_name] = {}
                group_hist_data[bin_idx][group_name][col] = counts[bin_idx]

    # Convert each bin's dictionary into a DataFrame
    for bin_idx in range(n_bins):
        v = pd.DataFrame.from_dict(group_hist_data[bin_idx], orient="index").astype(np.int32)
        out[f"h_{bin_idx:03}"] = v

    return out, bin_edges


def get_uncertainty(df):
    q5 = df.quantile(.05)
    q95 = df.quantile(.95)
    median = df.median()
    mean = df.mean()

    ci_width = q95 - q5
    # uncertainty = 1 - (ci_width / df.mean().abs())
    uncertainty = (median - mean) / ci_width
    # uncertainty = np.clip(uncertainty, 0, 1)
    uncertainty[np.isnan(uncertainty)] = 0
    return uncertainty


def get_aggregates(df):
    # Compute the histogram only on features.
    out = {
        'mean': df.mean(numeric_only=True),
        'median': df.median(numeric_only=True),
        # NOTE: if ddof is not set to 0, will return NaN if only 1 element in
        # the groupby DF...
        'std': df.std(ddof=0, numeric_only=True),

        'min': df.min(),
        'max': df.max(),
        'count': df.count().astype(np.int32),
    }
    out['uncertainty'] = get_uncertainty(df)
    hist, bin_edges = get_histogram_groupby(df, n_bins=N_BINS)
    out.update(hist)
    return out, bin_edges


def compute_histogram(data, bins=None):
    assert bins is not None
    n = len(data)
    vmin = bins[0]
    vmax = bins[-1]
    counts, _ = np.histogram(data, bins=bins)
    return {
        'total_count': int(n),
        'vmin': float(vmin),
        'vmax': float(vmax),
        'counts': counts,
    }


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
        if isinstance(value, list):
            value = [clean(v) for v in value]
        cleaned[key] = value
    return cleaned


# ---------------------------------------------------------------------------------------------
# Ephys data creation
# ---------------------------------------------------------------------------------------------

def make_ephys_data(local_data_path, output_dir=None, short_desc=None, key='mean', n_jobs=1):

    br = BrainRegions()
    mapping = 'Allen'
    label = 'latest'
    hemisphere = 'left'

    df_voltage, df_clusters, df_channels, df_probes = \
        load_voltage_features(local_data_path.joinpath(label), mapping=mapping)

    df_voltage['atlas_id'] = df_channels['atlas_id'].astype(np.int32)
    df_voltage['atlas_idx'] = np.array(
        [_[0] for _ in br.id2index(df_voltage.atlas_id)[1]], dtype=np.int32)

    df_voltage = lateralize_features(df_voltage)

    df_voltage.drop(
        df_voltage[df_voltage[mapping + "_acronym"].isin(["void", "root"])].index, inplace=True)

    fnames = voltage_features_set()
    print("Feature names:", ", ".join(fnames))

    df_grouped = df_voltage[fnames + ['atlas_id', 'atlas_idx']].groupby('atlas_idx')

    # NOTE: right now, the bin edges of the histograms are computed on the *aggregated* values,
    # and they are *also* used for the full histogram.
    agg, bin_edges = get_aggregates(df_grouped)
    df_values = agg[key]
    # atlas_idxs = df_values.index
    atlas_ids = df_values['atlas_id']
    agg.pop(key)
    df_extra_values = agg  # dict {extra_key: df_with_feature_columns}

    def remap(stat, vs):
        agg = 'sum' if stat in ('count',) or stat.startswith('h_') else 'mean'
        out = api.make_features(atlas_ids, vs, hemisphere=hemisphere, agg=agg)
        return out

    def process_fname(fname):
        print(f'Processing {fname}...')
        short_desc = f'Ephys atlas feature: {fname}'
        values = df_values[fname]
        bins = bin_edges[fname]

        # Compute the histogram of all values (before region aggregation).
        histogram = compute_histogram(df_voltage[fname], bins=bins)

        data = remap(key, values)

        # {key (here: median, std...) => array of values}
        extra_values = {
            stat: remap(stat, df_extra_values[stat][fname].values)
            for stat in df_extra_values.keys()}

        payload = api.make_features_payload(
            fname, data, short_desc=short_desc, key=key,
            extra_values=extra_values, histogram=histogram)
        payload = clean(payload)
        api.save_payload(output_dir, fname, payload)

    # Parallel version.
    Parallel(n_jobs=n_jobs)(delayed(process_fname)(fname) for fname in fnames)

    # for fname in tqdm.tqdm(("psd_delta",)):
    #     process_fname(fname)


def plot_distributions(pqt_path, channels_path):
    df_voltage = pd.read_parquet(pqt_path)

    br = BrainRegions()
    df_channels = pd.read_parquet(channels_path)

    df_voltage['atlas_id'] = df_channels['atlas_id'].astype(np.int32)
    df_voltage['atlas_idx'] = np.array(
        [_[0] for _ in br.id2index(df_voltage.atlas_id)[1]], dtype=np.int32)
    df_voltage = lateralize_features(df_voltage)

    q = .00001
    for fname in ("alpha_std",):  # XLIMS.keys():
        values = df_voltage[fname]
        # vmin = values.min()  # np.quantile(values, q)
        # vmax = values.max()  # np.quantile(values, 1-q)
        vmin, vmax = XLIMS.get(fname)
        plt.hist(values, bins=np.linspace(vmin, vmax, 100))
        plt.title(fname)
        plt.show()


if __name__ == '__main__':
    ROOT_DIR = Path(__file__).parent
    DATA_DIR = ROOT_DIR / "data"

    bucket_uuid = 'add0d5a4-f10a-4b81'
    output_dir = DATA_DIR / f'features/ephys_{bucket_uuid}/'

    local_data_path = Path('/home/cyrille/GIT/IBL/paper-ephys-atlas/data')

    # plot_distributions(pqt_path, channels_path)
    make_ephys_data(local_data_path, output_dir=output_dir, n_jobs=12)
