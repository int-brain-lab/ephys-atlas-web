# Notes for Agents

This repository is the active codebase for the IBL ephys atlas web app.

The project is an interactive brain-atlas website for viewing region-level features across multiple representations of the brain, including 2D slice views, top and swanson projections, bar-plot summaries, and a 3D Unity/WebGL view. Users can load feature buckets, switch mappings/statistics/colormaps, inspect and select regions, and work with uploaded or custom feature sets through the backend API.

Agents working in this repo will usually be doing one of four things:

- modifying frontend behavior or rendering
- modifying backend bucket/feature API behavior
- updating data-generation or deployment artifacts used by the site
- debugging interactions between generated atlas data and the runtime UI

For ephys data regeneration work, be aware that some upstream scientific/data-generation logic lives outside this repository. In particular, `iblbrainviewer` is an important external dependency in the ephys feature-generation workflow, even though this repository itself is the web app rather than that upstream Python package.

For non-trivial frontend work, read `docs/frontend-architecture.md` early; it explains the state/model/dispatcher pattern and the main JS module groups.
For non-trivial backend or data-generation work, read `docs/backend-architecture.md`; it explains the Flask API, on-disk storage model, and generation-script responsibilities.

## 1. Repository orientation

### Active areas

Treat these as the main maintained parts of the repo:

- `index.html`
- `js/`
- `css/`
- `images/`
- `server.py`
- `generate.py`
- `make_ephys.py`
- `tools/`
- `data/`
- `Unity/`
- `Build/`
- `StreamingAssets/`
- `docs/`

### Legacy/reference areas

These are old/reference material unless a task explicitly targets them:

- `_old/`
- `welldone/`
- `2023_W34/`

Do not treat legacy directories as authoritative over the active implementation.

---

## 2. What is authoritative

When understanding current behavior, prefer this order:

1. active source code in `js/`, `css/`, `index.html`, `server.py`
2. generation scripts such as `generate.py`, `make_ephys.py`, and `tools/*`
3. current runtime artifacts under `data/`
4. notebooks under `docs/`
5. legacy/reference directories

If docs and code disagree, trust the active code.

---

## 3. High-level architecture

The repo has four main subsystems:

1. **Static frontend**
   - entrypoint: `js/main.js`
   - main wiring: `js/app.js`
   - app modules live across `js/*`

2. **Flask backend API**
   - implemented in `server.py`
   - handles bucket and feature CRUD under `/api/...`

3. **Generated runtime/deployment data**
   - mostly under `data/`
   - includes JSON, CSS, SVG slices, parquet files, mappings, and feature payloads

4. **Unity/WebGL viewer**
   - source and assets under `Unity/`, `Build/`, and `StreamingAssets/`
   - considered core and working, but relatively stable rather than heavily changing

---

## 4. Editing guidance

### Prefer source over generated artifacts

In normal work, prefer editing:

- `js/*`
- `css/*`
- `server.py`
- `generate.py`
- `make_ephys.py`
- `tools/*`

Avoid hand-editing generated files under `data/` unless the task is explicitly about patching a generated artifact.

In particular, do not casually hand-edit:

- `data/json/*`
- `data/css/*`
- `data/svg/*`
- derived feature payloads under `data/`

### Treat deployment/build artifacts carefully

Avoid changing these unless the task is specifically about Unity/WebGL or deployment assets:

- `Build/`
- `StreamingAssets/`
- large generated asset bundles

### Avoid legacy distractions

If you find similar files in `_old/`, `welldone/`, or `2023_W34/`, use them only as reference. Do not copy from them blindly into the active app.

---

## 5. Frontend architecture notes

- `js/main.js` is the browser entrypoint
- `js/app.js` creates the main application and wires modules together
- `js/constants.js` contains debug flags, backend base URL selection, slice constants, and volume sizing helpers
- `js/model.js`, `js/state.js`, and `js/dispatcher.js` are core coordination layers
- `js/slice.js`, `js/volume.js`, and `js/dotimage.js` contain important rendering/projection logic
- the frontend is plain JavaScript ES modules, not a framework app

### Local dev assumptions

- `js/constants.js` uses localhost detection for debug behavior
- on localhost, frontend expects the backend at `https://localhost:5000`
- local frontend is typically served over HTTPS at `https://localhost:8456`
- Unity is enabled by default

### Validation after frontend changes

At minimum, manually verify:

- app boot completes
- bucket/feature loading works
- slice views update correctly
- hover/selection interactions still work
- 3D view still loads
- browser console is reasonably clean

---

## 6. Backend/API notes

`server.py` is the main backend.

Important points:

- implements bucket and feature CRUD routes
- stores runtime feature data under `data/features/`
- contains local-debug URL assumptions
- may rely on environment-specific auth or local files in some flows

If changing route behavior or storage logic, inspect the surrounding helper functions in the same file first; much of the backend behavior is centralized there.

---

## 7. Data-generation notes

This repo contains scripts for maintaining website-facing data artifacts.

- `generate.py` handles generation of website-consumed derived data
- `make_ephys.py` handles ephys atlas feature generation workflows
- `tools/*` contains helpers and processing code used by those scripts

Assume that many files under `data/` are outputs of these workflows rather than hand-maintained source files.

If a task involves updating data semantics, prefer changing the generating code instead of editing outputs directly.

---

## 8. Volume slices rendering

- Slices are rendered with `<canvas>` elements overlaid by SVGs inside `.svg-canvas-container` wrappers. HTML has fixed IDs (`canvas-coronal`, `canvas-horizontal`, `canvas-sagittal`) and matching SVGs (`svg-coronal`, etc.).
- `js/volume.js`:
  - Infers axis permutation and per-axis downsample from the incoming ndarray (`shape`, `fortran_order`) against canonical sizes (528×320×456). Stores `axisSizes`, `downsample`, and helpers to map canonical axis coords to flat indices.
  - Sets canvas intrinsic `width/height` to the voxel plane size per slice and rebuilds `ImageData` accordingly. Slice index divides by `(2.5 * downsample[axis])`.
  - Maintains the original SVG `viewBox`, but sets `preserveAspectRatio="none"` so the SVG stretches with the canvas/container; voxel aspect is enforced via container `aspect-ratio`.
  - Uses `getVolumeSize`/`setVolumeSizeDynamic` (see `js/constants.js`) so other modules (e.g., `dotimage`) can read dynamic voxel sizes.
- `css/main.css`:
  - `.svg-wrapper` uses flex centering; `.svg-canvas-container` is `inline-block` with `width: 100%`, `height: auto`, and `overflow: hidden`.
  - Canvas/SVG set to `width/height: 100%`, `image-rendering: pixelated` for blocky voxel display.
- `index.html`: canvas `width/height` attrs removed; sizing is controlled by JS + CSS.
- `js/slice.js` crosshair/line positions are still based on legacy viewBox coordinates; if further alignment is needed, these should be rebased to dynamic dimensions.

### Overlay utilities

- `js/dotimage.js` imports `getVolumeSize` to align point projections with the dynamically inferred voxel grid.

### Constants

- `js/constants.js` exposes `getVolumeSize`/`setVolumeSizeDynamic` to override canonical sizes when volumes are transposed/downsampled.

---

## 9. Practical validation checklist

Because automated testing is minimal, agents should usually validate changes manually where possible.

After meaningful edits, check the relevant subset of:

- frontend loads over local HTTPS
- backend starts cleanly
- frontend connects to backend
- bucket list and features load
- selected feature updates bar plot and slice views
- coronal / horizontal / sagittal rendering still aligns well enough
- 3D Unity/WebGL view still loads if the task could affect it
- no obvious regressions in console or backend logs

---

## 10. Known traps

- `README.md` may lag behind implementation details; confirm in code if needed
- `pyproject.toml` is currently sparse and not the full operational dependency manifest
- `requirements.txt` and existing scripts are more representative of actual local setup
- `server.py` has embedded debug assumptions
- `data/` is central but mostly generated/deployed output
- legacy directories can look tempting but are not the active path

Use this file as orientation, then inspect the active code directly before making non-trivial changes.
