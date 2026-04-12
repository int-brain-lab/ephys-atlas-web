#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

commit_if_needed() {
  local message="$1"
  shift
  git add "$@"
  if ! git diff --cached --quiet; then
    git commit -m "$message"
  else
    echo "[skip] $message"
  fi
}

commit_if_needed \
  "test(frontend): add lightweight node tests for pure helpers" \
  package.json \
  js/core/region-helpers.js \
  js/core/volume-helpers.js \
  tests/frontend/region-helpers.test.js \
  tests/frontend/volume-helpers.test.js \
  js/region.js \
  js/volume.js

commit_if_needed \
  "refactor(frontend): centralize event names and add JSDoc type scaffolding" \
  js/core/events.js \
  js/core/types.js \
  js/dispatcher.js \
  js/bucket.js \
  js/feature.js \
  js/panel.js \
  js/region.js \
  js/slice.js \
  js/volume.js

commit_if_needed \
  "refactor(state): add explicit state mutation helpers for low-risk flows" \
  js/state.js \
  js/bucket.js \
  js/feature.js \
  js/panel.js \
  js/region.js \
  js/slice.js

commit_if_needed \
  "chore(dev): add uv-backed justfile maintenance commands" \
  justfile \
  package.json \
  README.md \
  tools/apply_refactor_commits.sh \
  frontend.sh \
  backend.sh \
  dev.sh \
  scripts

if git status --short | grep -qE '^( M|M |A |D |R |\?\?)'; then
  echo
  echo "Remaining uncommitted changes:"
  git status --short
else
  echo
  echo "All planned commits were created."
fi
