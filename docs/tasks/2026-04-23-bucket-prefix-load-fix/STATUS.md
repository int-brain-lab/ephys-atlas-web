# Bucket prefix load fix

## Context
Selecting/loading buckets whose IDs share prefixes (for example `ephys` and `ephys_clusters`) could load the first glob match instead of the exact bucket. The backend bucket resolver used filesystem glob ordering for `<alias>_<uuid>` names.

## Plan
1. Inspect frontend/backend bucket resolution paths. ✅
2. Fix prefix matching to use exact bucket identity where appropriate. ✅
3. Validate with targeted checks. ✅

## Work completed
- Git preflight passed.
- Updated `server.py:get_bucket_path()` to:
  - prefer exact directory names first,
  - sort candidate paths deterministically,
  - inspect each candidate `_bucket.json`,
  - require exact `uuid` or `alias` metadata match before legacy fallback.
- Added a unit test covering `ephys` vs `ephys_clusters` alias-prefix disambiguation.

## Current state
Targeted backend validation passes. Existing local data now resolves:
- `ephys` -> `data/features/ephys_add0d5a4-f10a-4b81`
- `ephys_clusters` -> `data/features/ephys_clusters_2eeaf49c-f196-0270`

## Commits made
- Fix bucket alias prefix resolution (current commit)
