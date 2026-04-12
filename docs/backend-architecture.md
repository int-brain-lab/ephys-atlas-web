# Backend architecture

This document describes the backend and backend-adjacent maintainer code in this repository.

In this repo, “backend” means two related things:

1. the **runtime Flask API** in `server.py`
2. the **maintainer-side data-generation scripts** that produce or update assets consumed by the website

This repository is primarily the web app. Some scientific/data-generation dependencies used by maintainer workflows live outside this repository. In particular, `iblbrainviewer` matters for some ephys data-generation tasks, but it is **not** the runtime backend of this repo.

---

## 1. High-level mental model

The backend side of this repo is easiest to understand as three layers:

### A. Runtime API layer

Implemented in `server.py`.

This is the Flask service the frontend talks to for bucket and feature operations.

### B. On-disk storage layer

Mostly under:

- `data/features/`

Each bucket is stored as a directory containing:

- `_bucket.json` for bucket metadata
- one JSON file per feature

### C. Maintainer generation layer

Implemented mainly in:

- `generate.py`
- `make_ephys.py`
- `tools/*`

These scripts generate or update website-facing assets under `data/`.

---

## 2. Runtime backend: `server.py`

`server.py` is the main backend implementation.

It does several jobs in one file:

- defines the Flask app
- configures CORS
- manages bucket and feature storage on disk
- handles authentication for write operations
- exposes REST endpoints
- includes a small test suite
- runs the development server over local HTTPS when executed directly

So this file is both:

- the API layer
- the main storage/business-logic layer

---

## 3. Storage model

### Features root

The backend stores bucket data under:

- `data/features/`

### Bucket layout

A bucket is a directory, usually named with the bucket UUID and optionally an alias.

Examples of directory naming patterns supported by the lookup code:

- `uuid`
- `alias_uuid`
- `uuid_alias`

The lookup logic in `get_bucket_path()` searches multiple patterns rather than assuming one exact naming format.

### Bucket contents

A bucket directory typically contains:

- `_bucket.json` — bucket metadata
- `<feature_name>.json` — one JSON file per feature

### Bucket metadata

Bucket metadata is created and maintained through helpers such as:

- `create_bucket_metadata()`
- `save_bucket_metadata()`
- `load_bucket_metadata()`
- `update_bucket_metadata()`

Metadata may include fields like:

- `uuid`
- `alias`
- `url`
- `tree`
- `short_desc`
- `long_desc`
- `token`
- `last_access_date`

### Feature payloads

Feature JSON files are stored with a wrapper like:

- `feature_data`
- `short_desc`

`feature_data` must currently contain either:

- `mappings`
- or `volume`

This matches the frontend’s expectation that a feature is either region/mapping-based, volume-based, or both in a compatible payload structure.

---

## 4. Backend business logic structure

`server.py` is internally organized roughly like this:

1. global configuration/constants
2. utility functions
3. bucket metadata helpers
4. authentication helpers
5. core bucket/feature business logic
6. REST endpoints
7. tests
8. script entrypoint

Important business-logic functions include:

- `get_bucket()`
- `create_bucket()`
- `delete_bucket()`
- `create_features()`
- `delete_features()`
- `get_feature_metadata()`

These functions are the real core of the backend. The Flask route handlers are mostly thin wrappers around them.

So if you are modifying backend behavior, read the helper functions first, not only the route decorators.

---

## 5. Authentication model

The backend uses a simple token-based scheme.

### Global key

Creating a brand-new bucket requires a global key read from:

- `~/.ibl/globalkey`

Relevant functions:

- `read_global_key()`
- `authorize_global_key()`

### Bucket token

Each bucket has its own token stored in bucket metadata.

Relevant functions:

- `load_bucket_token()`
- `authenticate_bucket()`

This token is used to authorize write operations on that bucket, such as:

- patching bucket metadata
- creating features in the bucket
- patching features
- deleting features
- deleting the bucket

### Authorization header

Write routes expect a bearer token in the `Authorization` header.

Extraction happens in:

- `extract_token()`

This is simple and practical, but it is also tightly coupled to local/server file setup.

---

## 6. REST API surface

The main runtime API currently consists of these routes.

### Buckets

- `POST /api/buckets`
  - create a bucket
  - requires global-key authorization

- `GET /api/buckets/<uuid>`
  - retrieve bucket metadata and feature list

- `PATCH /api/buckets/<uuid>`
  - patch bucket metadata
  - requires bucket authorization

- `DELETE /api/buckets/<uuid>`
  - delete the bucket
  - requires bucket authorization

### Features

- `POST /api/buckets/<uuid>`
  - create a feature inside a bucket
  - requires bucket authorization

- `GET /api/buckets/<uuid>/<fname>`
  - retrieve feature JSON
  - also updates the bucket `last_access_date`
  - can optionally force file download with `?download=1`

- `PATCH /api/buckets/<uuid>/<fname>`
  - replace/update an existing feature payload
  - requires bucket authorization

- `DELETE /api/buckets/<uuid>/<fname>`
  - delete a feature
  - requires bucket authorization

The route code is intentionally fairly thin; most behavior is delegated to helper functions.

---

## 7. Runtime behavior and local development

When `server.py` is run directly:

- it can run its built-in test suite if invoked with `test`
- otherwise it starts the Flask app over HTTPS
- it uses local certificate files:
  - `localhost.pem`
  - `localhost-key.pem`

Important local behavior:

- CORS is enabled
- debug mode is enabled in the development entrypoint
- some URLs are switched to localhost-specific values when `DEBUG = True`

This is one reason backend changes should be checked in both:

- local/dev assumptions
- production/deployment assumptions

---

## 8. Relationship to the frontend

The frontend mainly depends on the backend for:

- bucket metadata
- feature metadata
- feature payload downloads
- mutating bucket/feature content in maintainer workflows

The frontend’s `model.js` builds its bucket/feature URLs around the backend API base URL. So backend response shape changes can easily break frontend assumptions.

In practice, the most important compatibility contract is:

- bucket JSON shape from `GET /api/buckets/<uuid>`
- feature JSON shape from `GET /api/buckets/<uuid>/<fname>`

If you change those, inspect the frontend model/feature-loading code immediately.

---

## 9. Maintainer-side generation layer

The backend is not just the Flask server. A major part of maintenance is generating the data that the frontend and backend serve.

### `generate.py`

This script is focused on generating website-facing derived artifacts such as:

- `regions.json`
- default region color CSS
- shared region color CSS
- feature payload structures derived from upstream tables

Key ideas in `generate.py`:

- load region/mapping parquet files
- normalize them into frontend/backend-friendly dictionaries
- compute aggregate statistics
- write JSON/CSS outputs into `data/`

It bridges scientific/tabular inputs into the app’s runtime assets.

### `make_ephys.py`

This script is focused on ephys feature generation.

It:

- reads feature tables from disk
- groups values by atlas region
- computes aggregate stats and histogram bins
- remaps values into atlas-compatible feature payloads
- writes payloads for website use

This script depends on external scientific Python packages and local datasets that are not fully defined by this repo alone.

`iblbrainviewer` is relevant here as an upstream dependency in the ephys generation workflow.

### `tools/process.py`

This module provides lower-level helpers and constants used by generation code, including:

- data directory constants
- mappings/constants
- colormap generation
- SVG processing utilities
- JSON/text writing helpers

It is best thought of as shared infrastructure for asset generation rather than runtime request handling.

---

## 10. Generated assets vs source code

One of the most important maintainer distinctions in this repo is:

### Source-ish code

- `server.py`
- `generate.py`
- `make_ephys.py`
- `tools/*`

### Generated/deployed outputs

- much of `data/json/*`
- much of `data/css/*`
- much of `data/svg/*`
- bucket/feature payloads under `data/features/*`

Normally, maintainers should prefer changing the source scripts and regenerating artifacts instead of hand-editing generated outputs.

---

## 11. Tests and validation

### Built-in backend tests

`server.py` includes a small `unittest` suite that exercises:

- bucket creation
- bucket retrieval
- bucket patching
- feature creation
- feature retrieval
- feature patching
- feature deletion
- bucket deletion

This gives some coverage for the storage/API flow, but it is still limited.

### Practical manual validation

After backend changes, validate at least:

- backend starts locally
- bucket GET works for expected buckets
- feature GET works for expected features
- authenticated write operations still work
- frontend can still load buckets/features from the backend
- no unexpected shape changes were introduced in JSON responses

---

## 12. Design strengths

Useful properties of the current backend organization:

- simple storage model
- very little abstraction overhead
- route handlers are easy to follow
- business logic is explicit and mostly centralized in one file
- feature/bucket JSON shape is straightforward
- maintainer scripts live close to the web app they support

---

## 13. Design tradeoffs / rough edges

Important tradeoffs to be aware of:

### `server.py` is doing many jobs

It combines configuration, auth, storage, routes, tests, and startup logic in one file.

### Local-debug assumptions are embedded

Some localhost URLs and debug settings are hardcoded in ways that are convenient but not very environment-agnostic.

### File-backed storage is simple but opinionated

Directory naming and token storage are pragmatic, but not heavily abstracted or normalized.

### Runtime and maintainer concerns live close together

That is convenient for maintainers, but it means this repo is not a narrowly isolated API service.

### External generation dependencies exist

Some regeneration workflows depend on external packages/data environments, so this repo alone is not always sufficient to reproduce all outputs from scratch.

---

## 14. Practical advice when changing backend-related code

### If you are changing the API

Start with:

- `server.py`
- frontend feature/bucket loading code in `js/model.js`
- any UI pieces relying on the changed response shape

### If you are changing bucket/feature storage behavior

Start with:

- `get_bucket_path()`
- metadata helpers
- `create_bucket()` / `create_features()` / delete helpers
- tests in `server.py`

### If you are changing generated data shape

Start with:

- `generate.py`
- `make_ephys.py`
- `tools/process.py`
- then verify the frontend consumers in `js/model.js`, `js/feature.js`, `js/coloring.js`, `js/volume.js`, etc.

### If you are debugging a maintainer data issue

Ask first:

- is the problem in the source data?
- in the generation script?
- in the saved JSON/CSS output?
- or in the frontend interpretation of that output?

---

## 15. Summary

The backend side of this repo is best understood as:

- a **simple Flask bucket/feature API** in `server.py`
- a **file-backed storage model** under `data/features/`
- a **maintainer generation pipeline** built around `generate.py`, `make_ephys.py`, and `tools/*`

It is practical, compact, and maintainer-friendly, but it also relies on implicit conventions, local environment assumptions, and some external generation dependencies.
