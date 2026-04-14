# Frontend Refactor Plan

This document tracks the current frontend refactor sequence in the active app code under `js/`.

It is based on the current branch history plus a scan of the active codebase. If code and this plan diverge, trust the code.

## Completed refactor work

Recent landed refactor sequence:

- `3218e97` `refactor(frontend): centralize event names and add JSDoc type scaffolding`
- `31c0ca9` `refactor(state): add explicit state mutation helpers for low-risk flows`
- `e0c55d8` `refactor(color): extract pure color and histogram helpers`
- `d56ef21` `refactor(state): extract URL serialization helpers`
- `599c8a3` `refactor(events): use centralized event constants across UI modules`
- `096ea9e` `refactor(dom): add required-element helpers for core UI modules`
- `c9460d2` `refactor(dom): apply required-element guards across remaining UI modules`
- `24822b8` `refactor(dom): guard share and coloring DOM dependencies`
- `2fabaca` `refactor(frontend): extract coloring rule helpers`
- `44fd33d` `refactor(frontend): extract panel range helpers`
- `75ba169` `refactor(volume): extract volume UI helpers`
- `8af57bc` `WIP: refactor volume handling in frontend`
- `8be3824` `WIP: refactor slice`
- `89d76a1` `Refactor dots`
- `2c67633` `WIP: colormap refactor`

Related bug-fix commits that validated the refactor lane in real usage:

- `e74e226` `Fix colormap range with negative values in sidebar`
- `61c9adf` `Fix bug with displayed value with mouse hovering in volume`

Main direction so far:

- move stringly-typed app events into `js/core/events.js`
- move reusable pure logic into `js/core/*`
- make DOM contracts explicit with required-element helpers in `js/core/dom.js`
- reduce hidden coupling before broader structural cleanup

## Current status

The low-risk helper-extraction pass is now largely complete for the main volume/slice interaction lane.

The active frontend now has extracted helper modules for:

- colors and region-color rule generation
- histogram logic and DOM rendering
- panel range and URL-reset helpers
- slice geometry and wheel-step logic
- dot-image coordinate and nearest-point logic
- volume axis mapping, voxel indexing, hover coordinate mapping, and UI rules
- state URL handling and event constants

The frontend node test suite is green via `npm run test:frontend`, and the recent volume/slice/panel changes have also been manually validated in the browser.

## What this means

The repo is no longer in the “finish obvious helper extraction” stage.

That stage is effectively done for the safest modules. The remaining refactor work is now broader and more coupled, meaning the next tasks should be chosen more deliberately instead of continuing to extract tiny helpers everywhere.

## Remaining higher-coupling areas

The main frontend modules that still mix DOM access, dispatcher wiring, state interpretation, and rendering decisions are now things like:

- `js/colorbar.js`
- `js/coloring.js`
- `js/region.js`
- parts of `js/panel.js` tied to export/reset/share UI

These are still valid refactor targets, but they are less “free win” territory than `volume.js`, `slice.js`, or `dotimage.js` were.

## Recommended next steps

### 1. Keep the current refactor lane stable

Do not immediately stack a large new cleanup on top of the recent volume/slice/dot/panel work unless there is a concrete payoff.

The current frontend path has already been improved materially and manually validated.

### 2. If continuing, pick one broader module only

Recommended next target order:

- `js/colorbar.js`
- `js/coloring.js`
- `js/region.js`

Why `colorbar.js` first:

- it is adjacent to the recent histogram and colormap-range fixes
- it is more bounded than `coloring.js`
- it still has a reasonable amount of state/histogram/display coupling that could be separated cleanly

### 3. Keep the same extraction rules

For any further frontend refactor work:

- extract pure computations first
- keep constructor and public API stable
- avoid intentional behavior changes inside refactor commits
- add or extend `tests/frontend/*.test.js` in the same series
- manually verify the directly affected browser flow before moving on

### 4. Prefer pausing over refactoring for its own sake

At this point, it is reasonable to stop the refactor pass and return to feature or bug work on a cleaner base.

The current codebase is in a meaningfully better state than the one this plan started from.

## Proposed immediate task order

1. Keep the current refactor commits as the boundary of the low-risk frontend cleanup phase.
2. Update this plan whenever a broader module refactor actually begins.
3. If a next frontend refactor is desired, start with `js/colorbar.js` and keep the scope narrow.

## Notes

- This plan is for the active frontend only, not legacy directories.
- Avoid hand-editing generated assets under `data/` as part of this refactor unless a task explicitly requires it.
- Keep commits narrow and reversible.
