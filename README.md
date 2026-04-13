# IBL ephys atlas web app

Interactive web application for exploring brain-region features in the IBL atlas across 2D slice views, top/swanson projections, and a 3D Unity/WebGL view.

This repository is the **web app** and its deployment/runtime assets. It also contains scripts used by maintainers to regenerate web-facing data artifacts.

---

## Who this README is for

This repository serves several audiences. Use the section that matches your goal:

- **Run the app locally**: see [Local development quickstart](#local-development-quickstart)
- **Understand the codebase**: see [Repository layout](#repository-layout) and [Architecture overview](#architecture-overview)
- **Maintain or regenerate data for the website**: see [Maintainer workflows](#maintainer-workflows)
- **Deploy/update the hosted app**: see [Deployment notes](#deployment-notes)

---

## Repository layout

### Active code and assets

- `index.html` — main application shell
- `js/` — frontend application logic
- `css/` — frontend styling
- `images/` — static images and branding assets
- `server.py` — Flask backend for bucket/feature APIs
- `features/` — feature payload examples / runtime assets
- `data/` — atlas data, mappings, generated JSON/CSS, feature payloads, parquet files, SVG slices
- `generate.py` — scripts for generating website-facing data artifacts
- `make_ephys.py` — maintainer script for regenerating ephys atlas feature outputs
- `tools/` — data-processing helpers used by generation scripts
- `Unity/`, `Build/`, `StreamingAssets/` — Unity/WebGL 3D viewer source and built assets
- `docs/` — notebooks documenting upload flows, mappings, API usage, and website behavior

### Legacy / reference directories

These are kept for history/reference and should not be treated as the primary implementation unless a task explicitly targets them:

- `_old/`
- `welldone/`
- `2023_W34/`

---

## Architecture overview

The app is split into four main parts:

1. **Static frontend**
   - Served from `index.html`, `js/`, `css/`, `images/`, and `data/`
   - Main entrypoint is `js/main.js`
   - Application wiring happens in `js/app.js`
   - Shared runtime constants live in `js/constants.js`

2. **Flask backend API**
   - Implemented in `server.py`
   - Serves bucket and feature CRUD endpoints under `/api/...`
   - Used by the frontend when connecting to the features service

3. **Generated atlas data**
   - Region metadata, mappings, colors, slice assets, parquet tables, and feature payloads live under `data/`
   - These files are usually generated or synchronized, not hand-edited

4. **Unity/WebGL viewer**
   - 3D view is backed by Unity/WebGL assets in `Unity/`, `Build/`, and `StreamingAssets/`
   - This is a core part of the app, stable in practice, but not an area with frequent heavy maintenance

---

## Local development quickstart

Preferred local workflow: run **frontend + backend** together, using local HTTPS.

### Prerequisites

Only lightly tested on Ubuntu/Linux.

Install:

- Python and `uv`
- Node/npm
- `http-server`
- `just`
- `svgo`
- `inkscape`
- local HTTPS certificate tooling (`mkcert`) if you need to regenerate certs

Example:

```bash
sudo apt-get install npm
sudo npm install --global http-server
```

Install `just` using your preferred package manager, for example on Ubuntu:

```bash
sudo apt install just
```

If local HTTPS certs are missing and you want to recreate them:

```bash
sudo apt install libnss3-tools
mkcert -install
mkcert localhost
```

This should create local certificate files similar to:

- `localhost.pem`
- `localhost-key.pem`

### Python environment

The backend workflow uses `uv` to manage the local virtual environment and install Python dependencies.

```bash
just backend-install
```

This command is idempotent and can be re-run when backend dependencies change.

This will create `.venv` if needed and install the backend requirements into it.

> `pyproject.toml` exists, but today `requirements.txt` and the existing commands are the more practical source of truth for runtime setup.

### Run the backend

In one terminal:

```bash
just backend
```

This starts the Flask backend from `server.py` using the local virtual environment.

If you also want it to install/update Python dependencies first:

```bash
just backend-install
```

This command is idempotent and can be re-run when backend dependencies change.

By default in local debug mode, the frontend expects the backend at:

- `https://localhost:5000`

### Run the frontend

In a second terminal:

```bash
just frontend
```

This serves the static frontend over HTTPS using the local certificate files.

By default, this runs at:

- `https://localhost:8456`

### Run both together

For the standard local workflow, you can launch both processes together:

```bash
just dev
```

Or, if you prefer npm scripts for local frontend tooling:

```bash
npm run dev
```

You can also validate the local prerequisites without starting servers:

```bash
just check
```

### Open the app

Open:

- `https://localhost:8456`

On localhost, the frontend automatically switches into debug/local mode and targets the local backend.

---

## Runtime behavior worth knowing

- The app downloads a substantial amount of data on startup; on mobile it warns before doing so
- `js/constants.js` switches API base URLs based on whether the host is localhost
- Unity/WebGL is enabled by default
- `js/main.js` currently unregisters any existing service worker on load
- The app is effectively a static frontend plus a Flask features service

---

## Maintainer workflows

### 1. Running the website locally while maintaining it

The normal maintainer workflow is:

1. run backend locally
2. run frontend locally over HTTPS
3. modify frontend/backend/data-generation code
4. regenerate data artifacts when needed
5. validate manually in the browser

### 2. Regenerating ephys feature outputs

Use `make_ephys.py` when ephys atlas feature payloads need to be rebuilt.

Typical output lands in:

- `data/ephys/`

Important notes:

- this repository is the **web app**, not the full upstream scientific/data-processing stack
- regenerating ephys outputs requires external Python packages and local data sources that are not fully defined inside this repository alone
- the script has environment-specific assumptions about input data locations

Before documenting a regeneration process for colleagues, prefer checking the current local paths and package environment used by your team.

### 3. Generating a local bucket from a volumetric NPZ

If you have a 4D NPZ volume (for example brain-wide ephys predictions) and want a local website-loadable bucket under `data/features/`, see:

- `docs/ephys-volume-dataset.md`

### 4. Regenerating website-facing data artifacts

Use `generate.py` and helpers in `tools/` when updating derived website assets such as:

- region metadata
- mapping outputs
- CSS derived from region colors
- feature payload structures used by the frontend

### 5. Data-editing expectations

In normal maintenance, do **not** directly edit generated files under `data/` unless the task is specifically about fixing or replacing a generated artifact.

Prefer changing:

- generation scripts
- upstream source data
- processing code in `tools/`

rather than hand-editing generated outputs.

---

## Repository conventions for maintainers

- Treat `js/`, `css/`, `index.html`, `server.py`, `generate.py`, `make_ephys.py`, `tools/`, `Unity/`, `Build/`, and `StreamingAssets/` as active
- Treat `_old/`, `welldone/`, and `2023_W34/` as legacy/reference
- Treat `data/` mostly as generated/deployed artifacts
- Prefer changing source scripts over modifying generated JSON/CSS/SVG data by hand

---

## Frontend notes for developers

- `js/main.js` is the browser entrypoint
- `js/app.js` instantiates and wires the main app modules
- `js/constants.js` controls debug mode, base URLs, slice constants, and volume sizing
- `js/volume.js` and `js/slice.js` contain most slice-rendering behavior
- `js/dotimage.js` handles projected point overlays
- `js/model.js`, `js/state.js`, and `js/dispatcher.js` are core coordination pieces

The frontend is modular but not framework-based; most work is plain ES modules plus DOM wiring.

---

## Backend notes for developers

`server.py` implements the Flask features API, including routes for:

- creating buckets
- listing/fetching buckets
- patching bucket metadata
- creating/fetching/patching/deleting features

Feature/bucket runtime data is stored under:

- `data/features/`

The backend currently includes local-debug assumptions and should be reviewed carefully before changing production-facing URL or auth behavior.

---

## Data directory notes

`data/` contains a mix of:

- generated JSON
- generated CSS
- SVG slice assets
- parquet tables
- feature payloads
- static runtime assets consumed by the frontend

A minimal placeholder note exists in `data/README.md`, but in practice this directory is a central deployment/runtime artifact store.

---

## Validation after changes

Because automated test coverage is limited, manual validation is important.

After frontend/backend changes, at minimum verify:

- the frontend loads successfully at `https://localhost:8456`
- the app connects to the local backend
- bucket list loads
- selecting a feature updates slice views and plots
- coronal / horizontal / sagittal slice views render correctly
- the 3D Unity/WebGL view still loads
- region hover/selection still behaves correctly
- no obvious console or backend errors appear

---

## Deployment notes

### Static frontend hosting

The app can be deployed as a static site with its assets served by Apache or another web server.

Example Apache virtual host:

```apache
<VirtualHost *:80>
    ServerAdmin admin@internationalbrainlab.org
    ServerName atlas.internationalbrainlab.org
    DocumentRoot /path/to/ephys-atlas-web
    AddOutputFilterByType DEFLATE application/javascript application/json
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

### CORS

If needed, Apache can be configured with permissive CORS headers such as:

```apache
Header set Access-Control-Allow-Origin *
Header set Access-Control-Allow-Methods: "GET, POST, OPTIONS, PUT, DELETE"
Header set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Content-Encoding"
```

### Backend hosting

The features service can be hosted separately with WSGI/Apache.

Example pattern used in this repository’s historical notes:

```apache
<VirtualHost *:443>
    ServerName features.internationalbrainlab.org

    WSGIDaemonProcess features user=ubuntu group=www-data threads=5 python-home=/var/www/ibl_website/atlas2/venv python-path=/var/www/ibl_website/atlas2/
    WSGIScriptAlias / /var/www/ibl_website/atlas2/features.wsgi

    <Directory /var/www/ibl_website/atlas2>
        WSGIProcessGroup features
        WSGIApplicationGroup %{GLOBAL}
        Require all granted
    </Directory>

    <LocationMatch ".*">
        CGIPassAuth On
    </LocationMatch>

    ErrorLog ${APACHE_LOG_DIR}/error_features.log
    CustomLog ${APACHE_LOG_DIR}/access_features.log combined
</VirtualHost>
```

Operational details such as secrets, auth files, and target host layout may be environment-specific.

---

## Scripts at a glance

- `frontend.sh` — serve frontend locally over HTTPS
- `backend.sh` — run Flask backend locally
- `export_data.sh` — package selected data assets
- `upload_data.sh` — rsync selected data to deployment target
- `download_webgl.sh` — helper for WebGL-related assets

Review each script before relying on it in a new environment.

---

## Documentation notebooks

The `docs/` directory contains maintainer/user guidance in notebook form, including:

- preparing atlas website data
- understanding mappings
- using the upload/API workflow
- using the website itself
- `docs/frontend-architecture.md` — frontend structure, state/model/dispatcher pattern, and key JS modules
- `docs/backend-architecture.md` — Flask API, file-backed bucket/feature storage, and maintainer generation scripts

These docs are helpful background, but the repository’s active implementation should still be treated as the source of truth.

---

## Known rough edges

- some docs are older than the current repo layout
- `pyproject.toml` is currently sparse and not a full project manifest
- backend debug/local assumptions are embedded in `server.py`
- there is very little automated testing in this repository
- some directories contain historical material that can distract from the active code path

---

## License

See `LICENSE`.
