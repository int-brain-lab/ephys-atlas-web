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

The broader module-boundary pass has also already happened in the active codebase:

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
- panel colormap-range ordering, display derivation, and reset URL building
- colorbar range and histogram-source resolution
- region filtering, title generation, and sort helpers
- coloring view derivation for CSS-rule rendering and websocket publication

The current frontend node test suite is green via `npm run test:frontend` with integration coverage now included.

Manual browser validation has already happened on the recently touched paths, including volume rendering, colormap range behavior, hover-value behavior, and panel/coloring changes.

## What changed since the previous plan

The previous version of this document still described integration-style tests as a future step.

That is now stale.

A thin integration test layer has started in `tests/frontend/integration-modules.test.js`.

It currently covers real cross-module flows for:

- volume feature selection keeping `Panel` and `Colorbar` aligned on histogram bounds and colormap choice
- non-volume feature selection updating `Coloring` CSS rules and `Region` list/title together
- reset/share state flows updating the URL and clipboard path consistently

This means the frontend is now in a third phase: stabilization through interaction coverage, not just helper extraction.

## Current architecture picture

The frontend is in a materially better state than when this plan started:

- repeated pure logic has mostly been moved into `js/core/*`
- event names and required DOM access are centralized
- `volume.js`, `slice.js`, `dotimage.js`, `panel.js`, `colorbar.js`, `coloring.js`, and `region.js` all have clearer seams than before
- helper-level tests exist for the main extracted logic, and interaction-level tests have started for module coordination

The remaining complexity is now concentrated in modules that still combine several responsibilities at once:

- dispatcher subscriptions
- state interpretation
- model queries
- DOM rendering and UI-specific side effects

The main remaining areas in that category are:

- the export path in `js/panel.js`
- parts of `js/share.js` / URL update coordination
- some coordination logic spread across `js/app.js`, `js/model.js`, and `js/dispatcher.js`

## Recommended next phase

The next phase should be short and deliberate.

It should focus on stabilization and only then decide whether a deeper architecture pass is justified.

### 1. Extend integration coverage around the remaining risky flows

Best next cases:

- volume hover value denormalization using loaded bounds
- local histogram rendering for selected regions
- panel toggle and URL-update coordination
- feature-to-coloring-to-unity data publication if that path is still important

### 2. Normalize API conventions in the modules already touched

Do a light consistency pass, not a redesign.

Target things like:

- consistent use of `init`, `setState`, `clear`, `render*`, and `sync*`
- avoiding duplicated dispatcher side effects where one method can own the flow
- trimming stale comments and unused parameters left behind by the refactor

### 3. Reassess before touching the core coordination layer

Only move into `js/app.js`, `js/model.js`, or `js/dispatcher.js` if there is a specific concrete payoff such as:

- a bug caused by event fan-out ordering
- repeated state/model orchestration patterns that are now blocking changes
- difficulty adding tests because core coordination is too implicit

## Suggested task order

Recommended order from here:

1. Add one more integration test for volume hover / bounds behavior
2. Add one more integration test for selection-driven local histogram behavior
3. Do a small naming/comment cleanup pass in the modules already refactored
4. Re-evaluate whether a deeper coordination refactor is worth the risk

## Suggested stopping point

A reasonable stopping point for the current frontend refactor effort is:

- helper extraction complete on the main interaction modules
- `coloring.js` and `panel.js` cleaned up to acceptable boundaries
- a thin but real integration-test layer covering the highest-risk cross-module flows

After that, stop and let feature or bug work drive any deeper architecture change.

## Notes

- This plan is for the active frontend only, not legacy directories.
- Avoid hand-editing generated assets under `data/` as part of this refactor unless a task explicitly requires it.
- Keep commits narrow and behavior-preserving where possible.
