# Generating a local website bucket from a 4D NPZ ephys volume

This repo can load local volumetric feature buckets from `data/features/<bucket>/`.

For a 4D NPZ like:

- `ephys_atlas_vol`: `[X, Y, Z, F]`
- `grid_shape`: `[3]`
- `mean_per_feature`: `[F]`
- `std_per_feature`: `[F]`
- `res_um`
- `feature_names`: `[F]`

use the repo-local conversion script:

```bash
.venv/bin/python tools/npz_to_local_volume_bucket.py \
  brainwide_ephys_atlas_25um.npz \
  --bucket my_ephys_volume \
  --overwrite
```

That writes:

- `data/features/my_ephys_volume/_bucket.json`
- one JSON feature payload per feature under `data/features/my_ephys_volume/`

## Why this script exists

There is volume support in `../iblbrainviewer`, but the current `iblbrainviewer.api.make_volume_payload()` path uses a default **50 µm** atlas histogrammer. A raw call to `FeatureUploader.local_volume()` is therefore not reliable for a **25 µm** volume like this one.

This script still uses `iblbrainviewer.api` for payload generation, but swaps in a histogrammer at the NPZ resolution so the payload is compatible with the atlas website.

## Important shape/orientation note

The script does **not** assume the input axis order matches the website payload directly.

Instead it:

1. reads `grid_shape`
2. reads the current `AllenAtlas(res_um=<res_um>).label.shape`
3. infers the exact permutation needed to match the Allen label volume
4. transposes each feature volume before building histograms/payloads

For the current NPZ dropped in repo root on 2026-04-13:

- NPZ `grid_shape`: `(456, 528, 320)`
- Allen label shape at 25 µm: `(528, 456, 320)`
- inferred transpose: `(1, 0, 2)`

## Outside-brain voxels

The script masks voxels where `AllenAtlas(...).label == 0` to `NaN` before export.

That is important because otherwise outside-brain zeros contaminate:

- the global histogram
- per-region voxel histograms
- display normalization

## Is missing prediction std/logvar a problem?

No. A local volumetric website feature only needs one scalar volume per feature.

For this workflow we export each feature as:

- volume name: `mean`
- feature payload name: `<feature_name>`

So not having per-voxel uncertainty/logvar is fine.

## Optional denormalization

If your NPZ volume is still in normalized units and should be mapped back with:

```python
value = value * std_per_feature + mean_per_feature
```

run:

```bash
.venv/bin/python tools/npz_to_local_volume_bucket.py \
  brainwide_ephys_atlas_25um.npz \
  --bucket my_ephys_volume \
  --denormalize \
  --overwrite
```

If the stored predictions are already in final physical units, do **not** pass `--denormalize`.

## Quick test on one feature first

Before exporting the whole bucket, it is useful to try one feature:

```bash
.venv/bin/python tools/npz_to_local_volume_bucket.py \
  brainwide_ephys_atlas_25um.npz \
  --bucket my_ephys_volume_test \
  --feature rms_lf \
  --overwrite
```

## Loading it locally in the website

After generating the bucket:

1. run the backend locally:

   ```bash
   just backend
   ```

2. run the frontend locally:

   ```bash
   just frontend
   ```

3. open:

   - `https://localhost:8456`

4. select the new bucket in the bucket dropdown

The backend serves bucket contents from `data/features/`, so no remote upload step is needed for this local workflow.
