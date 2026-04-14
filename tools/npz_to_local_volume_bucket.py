#!/usr/bin/env python3
"""Convert a 4D NPZ ephys volume into a local atlas website bucket.

This script is intended for maintainer-side generation of local website-loadable
volume features under ``data/features/<bucket>/``.

Expected NPZ fields
-------------------
- ephys_atlas_vol: array of shape [X, Y, Z, F]
- grid_shape: shape of the atlas volume [3]
- mean_per_feature: [F]
- std_per_feature: [F]
- res_um: scalar or length-1 array
- feature_names: [F]

Notes
-----
- The current ``iblbrainviewer.api.make_volume_payload()`` path uses a default
  50 um histogrammer. For 25 um volumes we temporarily swap in a histogrammer
  with the requested resolution so per-region histograms are generated against
  the correct Allen label volume.
- Voxels outside the Allen brain mask are set to NaN before payload generation.
"""

from __future__ import annotations

import argparse
import json
import shutil
from itertools import permutations
from pathlib import Path

import numpy as np
from iblatlas.atlas import AllenAtlas
from iblbrainviewer import api
from tools.ephys_units import get_ephys_feature_unit


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_ROOT = ROOT_DIR / "data" / "features"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("npz_path", type=Path, help="Input NPZ file")
    parser.add_argument(
        "--bucket",
        required=True,
        help="Output local bucket name under data/features/",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help=f"Root output directory (default: {DEFAULT_OUTPUT_ROOT})",
    )
    parser.add_argument(
        "--bucket-short-desc",
        default="Local volumetric ephys predictions",
        help="Bucket short description",
    )
    parser.add_argument(
        "--feature-short-desc-template",
        default="Volumetric ephys prediction: {feature_name}",
        help="Per-feature short description template",
    )
    parser.add_argument(
        "--denormalize",
        action="store_true",
        help="Apply vol = vol * std_per_feature + mean_per_feature before export",
    )
    parser.add_argument(
        "--feature",
        action="append",
        dest="features",
        help="Only export the named feature(s); may be passed multiple times",
    )
    parser.add_argument(
        "--max-features",
        type=int,
        help="Only export the first N selected features (useful for testing)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Delete an existing output bucket directory first",
    )
    return parser.parse_args()


def infer_exact_axis_permutation(
    input_shape: tuple[int, int, int], target_shape: tuple[int, int, int]
) -> tuple[int, int, int]:
    for perm in permutations(range(3)):
        if tuple(input_shape[i] for i in perm) == target_shape:
            return perm
    raise ValueError(
        f"Could not find axis permutation mapping input shape {input_shape} "
        f"to Allen label shape {target_shape}"
    )


def make_bucket_metadata(bucket: str, feature_names: list[str], short_desc: str) -> dict:
    return {
        "uuid": bucket,
        "alias": None,
        "url": None,
        "tree": {name: name for name in feature_names},
        "volumes": list(feature_names),
        "short_desc": short_desc,
        "long_desc": None,
        "token": api.new_token(),
        "last_access_date": api.now(),
    }


def main() -> None:
    args = parse_args()

    npz_path = args.npz_path.resolve()
    if not npz_path.exists():
        raise FileNotFoundError(npz_path)

    output_dir = args.output_root / args.bucket
    if output_dir.exists():
        if not args.overwrite:
            raise FileExistsError(
                f"{output_dir} already exists; pass --overwrite to replace it"
            )
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with np.load(npz_path, allow_pickle=True) as z:
        required = {
            "ephys_atlas_vol",
            "grid_shape",
            "mean_per_feature",
            "std_per_feature",
            "res_um",
            "feature_names",
        }
        missing = sorted(required.difference(z.files))
        if missing:
            raise KeyError(f"Missing NPZ fields: {missing}")

        vol4d = z["ephys_atlas_vol"]
        feature_names = [str(x) for x in z["feature_names"].tolist()]
        mean_per_feature = np.asarray(z["mean_per_feature"], dtype=np.float32)
        std_per_feature = np.asarray(z["std_per_feature"], dtype=np.float32)
        grid_shape = tuple(int(x) for x in np.asarray(z["grid_shape"]).tolist())
        res_arr = np.asarray(z["res_um"])
        res_um = int(res_arr.reshape(-1)[0])

        if vol4d.ndim != 4:
            raise ValueError(f"Expected ephys_atlas_vol to be 4D, got shape {vol4d.shape}")
        if tuple(vol4d.shape[:3]) != grid_shape:
            raise ValueError(
                f"grid_shape {grid_shape} does not match ephys_atlas_vol[:3] {vol4d.shape[:3]}"
            )
        if vol4d.shape[3] != len(feature_names):
            raise ValueError(
                f"Feature count mismatch: volume has {vol4d.shape[3]} features, "
                f"feature_names has {len(feature_names)}"
            )

        atlas = AllenAtlas(res_um=res_um)
        label_shape = tuple(int(x) for x in atlas.label.shape)
        axis_perm = infer_exact_axis_permutation(grid_shape, label_shape)
        print(f"Input grid shape: {grid_shape}")
        print(f"Allen label shape ({res_um} um): {label_shape}")
        print(f"Using axis permutation: {axis_perm}")

        requested = set(args.features or [])
        if requested:
            selected = [f for f in feature_names if f in requested]
            missing_features = sorted(requested.difference(feature_names))
            if missing_features:
                raise KeyError(f"Requested unknown features: {missing_features}")
        else:
            selected = list(feature_names)

        if args.max_features is not None:
            selected = selected[: args.max_features]

        bucket_metadata = make_bucket_metadata(args.bucket, selected, args.bucket_short_desc)
        with open(output_dir / "_bucket.json", "w") as f:
            json.dump(bucket_metadata, f, indent=1, sort_keys=False)

        mask_outside_brain = atlas.label == 0
        feature_index = {name: i for i, name in enumerate(feature_names)}

        old_histogrammer = api._default_histogrammer
        api._default_histogrammer = api.VolumeRegionHistogrammer(
            res_um=res_um, n_bins=api.N_BINS
        )
        try:
            for rank, feature_name in enumerate(selected, start=1):
                idx = feature_index[feature_name]
                print(f"[{rank:02d}/{len(selected):02d}] Exporting {feature_name}")

                volume = np.asarray(vol4d[..., idx], dtype=np.float32)
                if args.denormalize:
                    volume = volume * std_per_feature[idx] + mean_per_feature[idx]

                volume = np.transpose(volume, axis_perm)
                volume[mask_outside_brain] = np.nan

                with np.errstate(invalid="ignore"):
                    payload = api.make_volume_payload(
                        feature_name,
                        {"mean": volume},
                        short_desc=args.feature_short_desc_template.format(
                            feature_name=feature_name
                        ),
                    )
                payload["unit"] = get_ephys_feature_unit(feature_name)
                api.save_payload(output_dir, feature_name, payload)
        finally:
            api._default_histogrammer = old_histogrammer

    print(f"Done. Wrote local bucket to {output_dir}")


if __name__ == "__main__":
    main()
