# Frontend Refactor Plan

This document tracks the current frontend refactor status in the active app code under `js/`.

It is based on the current branch plus a scan of the active codebase. If code and this plan diverge, trust the code.

## Refactor status

The current frontend refactor phase is complete.

The branch now includes:

- the initial helper-extraction pass across the main interaction modules
- a broader boundary-cleanup pass in UI-heavy modules
- a thin integration-test layer covering the highest-risk cross-module flows
- a final cleanup pass for naming, stale comments, and dead code in the touched modules

At this point, the frontend is no longer in an active “keep refactoring this lane” state. The codebase is at a reasonable stopping point, and any deeper changes should be driven by a concrete bug, feature, or architecture need rather than continuing the same pass by inertia.

## Completed refactor work

The main helper-extraction sequence that landed includes:

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

The broader module-boundary and stabilization pass also landed:

- `2c67633` `WIP: colormap refactor`
- `8731f5f` `Update frontend refactor plan`
- `a0e7432` `WIP: refactoring histogram`
- `fb53e4f` `Refactor regions`
- `64d483a` `Refactor coloring module`
- `1daeebc` `Refactor panel`
- `23ca434` `Add integration tests`
- `a4af679` `Add hover integration test`
- `bc94ebf` `Add colorbar integration test`
- `7e3f754` `refactor(frontend): finalize cleanup pass`

Related bug-fix commits that validated the refactor lane in real usage:

- `e74e226` `Fix colormap range with negative values in sidebar`
- `61c9adf` `Fix bug with displayed value with mouse hovering in volume`

## Current architecture picture

The active frontend now has extracted helper modules for:

- events and DOM contract helpers
- state URL serialization
- color conversion and region color rule generation
- histogram computation and histogram DOM rendering
- volume axis mapping, voxel indexing, hover coordinate mapping, and volume UI rules
- slice geometry, guide-line state, and wheel-step logic
- dot-image coordinate mapping and nearest-point lookup
- panel colormap-range ordering, display derivation, and reset URL building
- colorbar range and histogram-source resolution
- region filtering, title generation, and sort helpers
- coloring view derivation for CSS-rule rendering and websocket publication

The main interaction modules that were touched in this refactor now have clearer seams than before:

- `js/volume.js`
- `js/slice.js`
- `js/dotimage.js`
- `js/panel.js`
- `js/colorbar.js`
- `js/coloring.js`
- `js/region.js`

## Test and validation status

The frontend node test suite is green via `npm run test:frontend`.

That test coverage now includes both helper-level tests and integration-style tests.

Current integration coverage in `tests/frontend/integration-modules.test.js` includes:

- volume feature selection keeping `Panel` and `Colorbar` aligned on histogram bounds and colormap choice
- non-volume feature selection updating `Coloring` CSS rules and `Region` list/title together
- reset/share state flows updating the URL and clipboard path consistently
- volume hover publishing denormalized bounds-based values through the tooltip path
- selected-region local histogram overlay behavior in `Colorbar`

Manual browser validation has also already happened on the recently touched paths, including volume rendering, colormap range behavior, hover-value behavior, panel/coloring behavior, and related UI flows.

## Recommended next phase

Do not continue this refactor lane by default.

The next work should be one of these, depending on actual need:

1. Feature or bug work on top of the current cleaner baseline.
2. A dedicated `js/` directory reorganization pass if file layout starts causing friction.
3. A deeper architecture pass only if there is a concrete payoff in `js/app.js`, `js/model.js`, or `js/dispatcher.js`.

If another frontend cleanup pass is started later, it should be treated as a new phase rather than a continuation of this one.

## Notes

- This plan is for the active frontend only, not legacy directories.
- Avoid hand-editing generated assets under `data/` as part of this refactor unless a task explicitly requires it.
- Keep future cleanup commits narrow and behavior-preserving where possible.
