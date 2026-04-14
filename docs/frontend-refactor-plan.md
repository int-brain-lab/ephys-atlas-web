# Frontend Refactor Plan

This document tracks the current frontend refactor state in the active app code under `js/`.

It is based on the current branch plus a scan of the active codebase. If code and this plan diverge, trust the code.

## Completed refactor work

The first refactor phase is complete. The main helper-extraction sequence that has already landed includes:

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

The next, broader module pass has also already started and is no longer just a proposal:

- `2c67633` `WIP: colormap refactor`
- `8731f5f` `Update frontend refactor plan`
- `a0e7432` `WIP: refactoring histogram`
- `fb53e4f` `Refactor regions`

Related bug-fix commits that came out of real usage during the refactor:

- `e74e226` `Fix colormap range with negative values in sidebar`
- `61c9adf` `Fix bug with displayed value with mouse hovering in volume`

## Current status

The low-risk helper-extraction phase is done for the main volume and slice interaction path.

The active frontend now has extracted helper modules for:

- events and DOM contract helpers
- state URL serialization
- color conversion and region color rule generation
- histogram computation and histogram DOM rendering
- volume axis mapping, voxel indexing, hover coordinate mapping, and volume UI rules
- slice geometry, guide-line state, and wheel-step logic
- dot-image coordinate mapping and nearest-point lookup
- panel colormap-range ordering and reset URL building
- colorbar range and histogram-source resolution
- region filtering, title generation, and sort helpers

The current frontend node test suite is green via `npm run test:frontend` with `13/13` passing.

Manual browser validation has also already happened on the recently touched paths, including volume rendering, colormap range behavior, and hover-value behavior.

## What changed since the previous plan

The previous version of this document still treated `colorbar.js` and `region.js` as future targets.

That is now stale.

Those modules have already been partially decomposed:

- `js/colorbar.js` now delegates range selection and histogram-source resolution to `js/core/colorbar-helpers.js`
- `js/region.js` now delegates visible-region derivation and title text to `js/core/region-helpers.js`

This means the frontend has moved out of the initial helper-extraction phase and into a second phase where the remaining gains will come from cleaner module boundaries, not just pulling out more isolated pure functions.

## Current architecture picture

The frontend is in a better state than when this plan started:

- repeated pure logic has mostly been moved into `js/core/*`
- event names and required DOM access are centralized
- the volume, slice, dot-image, histogram, panel, colorbar, and region paths have basic focused node tests

The remaining complexity is now concentrated in modules that still combine several responsibilities at once:

- dispatcher subscriptions
- state interpretation
- model queries
- DOM rendering and UI-specific side effects

The main remaining modules in that category are:

- `js/coloring.js`
- the still-heavy DOM/event portions of `js/panel.js`
- some coordination logic spread across `js/app.js`, `js/model.js`, and `js/dispatcher.js`

## Recommended next phase

The next phase should not be “extract more tiny helpers everywhere”.

It should be a boundary-cleanup and integration phase with three goals:

### 1. Stabilize module responsibilities

Focus on reducing mixed responsibilities inside the heaviest UI modules instead of chasing isolated utility extraction.

Best candidates:

- `js/coloring.js`
- the export/share/reset portions of `js/panel.js`
- selected coordination seams between `js/model.js`, `js/state.js`, and `js/dispatcher.js`

### 2. Add integration-level frontend coverage

The current tests are good for extracted helpers, but they do not cover module interaction very much.

The next confidence gain should come from small integration-style tests around things like:

- histogram range resolution for region vs volume features
- region list derivation from search, stat, and mapping changes
- volume hover value denormalization using loaded bounds
- color rule generation flowing into CSS rule construction

### 3. Improve consistency of module APIs

Several modules still expose broad methods like `setState()` while also reacting directly to many dispatcher events.

The next cleanup should aim for clearer internal conventions:

- consistent naming for `init`, `setState`, `clear`, and render/update methods
- fewer modules doing both state derivation and DOM mutation in the same long method
- explicit seams for “derive view data” vs “render DOM”

## Suggested task order

Recommended order for the next phase:

1. Update and simplify `js/coloring.js`
2. Split remaining UI-heavy logic in `js/panel.js` into smaller rendering and state-derivation seams
3. Add a small integration-style frontend test layer for the refactored flows
4. Reassess whether deeper coordination cleanup in `js/app.js` / `js/model.js` / `js/dispatcher.js` is worth the risk

## Suggested stopping point

Do not keep refactoring indefinitely at the same granularity.

A reasonable boundary for the current frontend refactor effort is:

- `js/coloring.js` cleaned up
- `js/panel.js` trimmed further where there is obvious mixed responsibility
- one thin layer of integration coverage added on top of the helper tests

After that, the codebase should be re-evaluated before attempting a broader architectural rewrite.

## Notes

- This plan is for the active frontend only, not legacy directories.
- Avoid hand-editing generated assets under `data/` as part of this refactor unless a task explicitly requires it.
- Keep commits narrow and behavior-preserving where possible.
