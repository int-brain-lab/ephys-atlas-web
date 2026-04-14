# Frontend Refactor Plan

This document tracks the current frontend refactor sequence in the active app code under `js/`.

It is based on the current branch history plus a quick scan of the active codebase. If code and this plan diverge, trust the code.

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

Main direction so far:

- move stringly-typed app events into `js/core/events.js`
- move reusable pure logic into `js/core/*`
- make DOM contracts explicit with required-element helpers in `js/core/dom.js`
- reduce hidden coupling before broader structural cleanup

## Current status

The low-risk helper-extraction pass is in good shape. The active frontend now has:

- centralized app event constants in `js/core/events.js`
- DOM lookup guards in `js/core/dom.js`
- extracted pure helpers for colors, histograms, state URL handling, coloring rules, panel ranges, region logic, and volume logic
- node-based frontend tests for the extracted helper seams

As of this update, the frontend helper test suite is green via `npm run test:frontend`.

The main remaining gap from the original refactor lane is not another small extraction; it is validation plus deciding the next structural target.

## Adjacent active work

The top of `main` also includes newer non-refactor or mixed-scope changes that affect the next frontend pass:

- `200ac20` `Unit update`
- `3e19260` `WIP: updating volume`

There is also backend/data-oriented unit work in:

- `9920304` `WIP: units`

That means the refactor plan should account for ongoing volume and unit semantics work rather than assuming the codebase is still sitting before the DOM sweep.

## Recommended next steps

### 1. Do a manual browser validation pass

Because the DOM/event/helper refactors touched initialization and UI wiring broadly, validate:

- app boot
- bucket and feature loading
- control panel interactions
- slice rendering and hover/selection
- region list and search
- colorbar and colormap updates
- share button behavior
- Unity/WebGL loading
- volume overlays and dot overlays

This is the highest-priority remaining step before deeper refactor work.

### 2. Stabilize the current volume and units lane

Before starting another broad cleanup, confirm the current volume and unit changes settle cleanly in:

- `js/volume.js`
- any connected type definitions or display logic

Preferred approach:

- keep behavior changes and refactor changes separated where possible
- avoid mixing UI cleanup with ongoing semantic changes to units or volume handling

### 3. Continue second-pass extraction on high-coupling modules

Once validation is complete, the next refactor tier is the modules that still mix:

- DOM access
- dispatcher wiring
- rendering logic
- state interpretation

Likely candidates:

- `js/volume.js`
- `js/slice.js`
- `js/panel.js`
- `js/dotimage.js`
- `js/coloring.js`

Preferred strategy:

- extract pure computations first
- keep constructor and public API stable
- avoid behavior changes during extraction commits
- add cheap tests for new pure helpers as they land

### 4. Keep helper coverage aligned with new extractions

Current helper coverage is already present for:

- `js/core/dom.js`
- `js/core/events.js`
- color, histogram, state URL, panel, region, and volume helper modules

As new helper seams are introduced, extend the node-based test suite in `tests/frontend/` in the same commit series.

### 5. Retire temporary refactor scripts when the sequence settles

There are local helper scripts for batching refactor commits under `tools/`. Once this lane settles, decide whether to:

- remove them
- keep only the reusable ones
- move durable developer workflow into `justfile`

## Proposed immediate task order

1. Run the browser regression pass for the current frontend.
2. Resolve any regressions from the current volume and units work.
3. Pick one high-coupling frontend module and extract only pure logic from it.
4. Add or extend focused frontend tests for each new helper seam.

## Notes

- This plan is for the active frontend only, not legacy directories.
- Avoid hand-editing generated assets under `data/` as part of this refactor unless a task explicitly requires it.
- Keep commits narrow and reversible.
