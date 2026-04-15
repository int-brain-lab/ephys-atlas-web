# Frontend Refactor Plan

This plan is intentionally incremental. The goal is to improve the maintainability of the frontend JavaScript without changing the architecture wholesale or taking on too much risk in one pass.

We will execute one step at a time.

Rules for this refactor:

- Keep runtime behavior stable unless a step explicitly says otherwise.
- Prefer extraction and renaming over rewrites.
- After every step:
  - run a small sanity check if available
  - manually test the affected UI
  - create a git commit before starting the next step
- If a step reveals hidden coupling, stop and adjust the next step rather than widening the current one.


## Working Style

Each step below has:

- scope
- concrete code changes
- manual test checklist
- suggested commit message

The intended workflow is:

1. implement the step
2. manually test only the areas listed for that step
3. commit the result
4. move to the next step


## Step 1: Add A Dedicated Refactor Baseline And Small Safety Nets

### Scope

Create lightweight structure and guardrails before moving logic around.

### Changes

- Add or update a short section in `docs/frontend-architecture.md` describing the refactor direction:
  - thin controllers
  - pure helpers in `js/core/*`
  - service-style modules for data/state policies
- Add a few small pure helper tests only if the repo already has a test convention that can run cheaply.
- If there is no usable frontend test harness, skip test infrastructure work for now.
- Add JSDoc typedefs where useful for:
  - feature payload shape
  - bucket metadata shape
  - normalized app state shape
- Identify and remove any obvious direct state field writes where setters already exist, but only if they are trivial and low-risk.

### Why First

This step gives clearer boundaries before extraction begins and reduces ambiguity during later changes.

### Manual Test

- App boots cleanly.
- Initial bucket and feature controls render.
- URL state still loads correctly.

### Commit

`docs/jsdoc: add frontend refactor baseline`


## Step 2: Extract State Defaults And Alias Definitions

### Scope

Reduce noise and responsibility inside `js/state.js` without changing behavior.

### Changes

- Create `js/state-defaults.js`.
- Move from `js/state.js` into that file:
  - default colormap constants
  - default bucket constants
  - default stat and mapping constants
  - alias-state definitions
- Export a compact set of named constants used by `State`.
- Keep `DEFAULT_BUCKET` and `DEFAULT_BUCKETS` publicly available so existing imports remain stable.
- Update `js/state.js` to import those values instead of defining them inline.

### Target Outcome

`js/state.js` should stop being a storage file for large static config blobs.

### Manual Test

- App boots from default URL.
- App boots from one alias URL if available locally.
- Reset view still returns to the expected baseline state.

### Commit

`refactor(state): extract defaults and alias config`


## Step 3: Extract State Normalization

### Scope

Separate state-shape construction from the mutable state container.

### Changes

- Create `js/core/state-normalize.js`.
- Move the normalization logic from `State.init()` into a pure function such as:
  - `normalizeAppState(input, options)`
- Keep semantics exactly the same:
  - bucket defaults
  - slice defaults
  - selected as `Set`
  - optional feature and volume flags
- Change `State.init()` to delegate to the pure normalizer and then assign fields.

### Target Outcome

The defaults and coercion rules become testable and easier to reason about independently of URL handling and mutation methods.

### Manual Test

- Default load still selects expected bucket and slices.
- Existing shared URLs still restore state correctly.
- Reset view still works.

### Commit

`refactor(state): extract state normalization`


## Step 4: Extract URL Persistence From State

### Scope

Make `State` an in-memory state holder rather than a browser-coupled router object.

### Changes

- Create `js/state-router.js`.
- Move out of `js/state.js`:
  - `url2state()`
  - `state2url()`
  - `fromURL()` browser-coupled parsing
  - `toURL()` serialization support
  - `updateURL()` history side effect
- Keep a thin API on `State`, for example:
  - `loadFromUrl()`
  - `serializeToUrl()`
  - `replaceUrl()`
  implemented via the router module
- Preserve the current public behavior so callers do not need broad changes yet.

### Target Outcome

`State` owns mutation and snapshots. `state-router.js` owns `window.location` and `history`.

### Manual Test

- Loading from a shared URL still works.
- Changing feature/mapping/colormap still updates the URL.
- Disabling URL updates during startup still avoids noisy URL churn.

### Commit

`refactor(state): extract url persistence`


## Step 5: Simplify App Construction With A Small Composition Layer

### Scope

Make startup order explicit and reduce `js/app.js` as a hand-written container.

### Changes

- Create `js/app-services.js`:
  - construct `Splash`
  - construct `State`
  - construct `Model`
  - construct `Dispatcher`
- Create `js/app-modules.js`:
  - construct all feature modules from shared services
- Keep `App` as the public entrypoint used by `main.js`.
- Change `App` so its constructor delegates object creation to the new helpers.
- Do not change runtime initialization order yet.

### Target Outcome

`js/app.js` should mostly describe orchestration, not low-level instantiation.

### Manual Test

- App boots normally.
- No module fails on construction due to ordering issues.
- Unity still loads when enabled.

### Commit

`refactor(app): extract service and module composition`


## Step 6: Make App Startup Phases Explicit

### Scope

Turn the implicit init ordering into named lifecycle phases.

### Changes

- Create `js/app-lifecycle.js`.
- Move the `init()` sequence from `js/app.js` into a function with named phases, for example:
  - `loadStaticData`
  - `suspendUrlUpdates`
  - `initPrimaryUi`
  - `initDependentUi`
  - `resumeUrlUpdates`
  - `initDeferredModules`
- Keep the exact module ordering that exists now unless there is a clear bug.
- Document any hard dependencies discovered during this step.

### Target Outcome

Initialization dependencies become explicit and easier to modify later.

### Manual Test

- App boot sequence remains clean.
- Region list still initializes before selection-dependent behavior.
- Unity still initializes after the rest of the app is usable.

### Commit

`refactor(app): extract startup lifecycle`


## Step 7: Extract Feature Catalog Logic From Model

### Scope

Move feature-tree and bucket ordering logic out of `Model`.

### Changes

- Create `js/feature-catalog.js`.
- Move from `js/model.js`:
  - `_flattenFeatureTree()`
  - `_getOrderedBucketFeatures()`
  - `_getVolumeFeatureSet()`
  - any feature-order helper logic needed by prefetching
- Design it as a pure or mostly pure module operating on bucket metadata.
- Keep `Model` methods delegating to it so external callers stay stable.

### Target Outcome

`Model` stops owning bucket feature catalog policy directly.

### Manual Test

- Feature dropdown still renders in the same order.
- Volume features are still recognized correctly.
- Changing buckets still shows the right feature list.

### Commit

`refactor(model): extract feature catalog`


## Step 8: Extract Feature Payload Accessors From Model

### Scope

Move payload interpretation out of `Model`.

### Changes

- Create `js/feature-payload.js`.
- Move from `js/model.js`:
  - `getFeaturesMappings()`
  - `getCmap()`
  - `getFeatures()`
  - `getHistogram()`
  - `getVolumeData()`
- Keep these as pure accessors over a decoded feature payload object.
- Keep `Model` as a delegating facade so the rest of the app does not change all at once.
- Avoid mutating payload objects during reads if possible.
  - In particular, avoid the current pattern that injects `is_volume` into the returned volume payload.

### Target Outcome

Feature payload interpretation is centralized and detached from network/cache concerns.

### Manual Test

- Selecting a non-volume feature still updates region colors and bar plot.
- Selecting a volume feature still activates volume rendering.
- Histogram-dependent controls still update.

### Commit

`refactor(model): extract feature payload accessors`


## Step 9: Extract Prefetch Policy From Model

### Scope

Isolate prefetch decisions from data access plumbing.

### Changes

- Create `js/feature-prefetch-policy.js`.
- Move from `js/model.js`:
  - `_buildPrefetchList()`
  - the filtering and task-building logic inside `scheduleFeaturePrefetch()`
- Keep the actual `PrefetchController` instances in `Model` for now.
- Make the new module responsible only for deciding which tasks should be scheduled.

### Target Outcome

`Model` decides when to schedule. The policy module decides what to schedule.

### Manual Test

- Selecting a feature still loads immediately.
- Navigating through features still feels responsive.
- Switching between volume and non-volume features does not produce obvious stale behavior.

### Commit

`refactor(model): extract prefetch policy`


## Step 10: Extract Static Resource Access From Model

### Scope

Separate atlas static data loading from feature/bucket services.

### Changes

- Create `js/atlas-static-store.js`.
- Move from `js/model.js`:
  - loader setup for colormaps, regions, slices
  - `load()`
  - `getColormap()`
  - `getRegions()`
  - `getSlice()`
- Keep the region filtering behavior identical at first, even if it is not ideal.
- Let `Model` compose:
  - `atlasStaticStore`
  - `featureStore`
  - prefetch controllers

### Target Outcome

`Model` becomes a small orchestration facade instead of the owner of all data concerns.

### Manual Test

- App boot still loads static atlas assets.
- Slice movement still updates figures.
- Colormap changes still work.
- Region list still populates.

### Commit

`refactor(model): extract static atlas store`


## Step 11: Deduplicate Feature Tree Formatting Between Model And Feature UI

### Scope

Remove parallel tree-flattening logic and make dropdown formatting explicit.

### Changes

- Create `js/core/feature-tree.js` or `js/core/feature-dropdown.js`.
- Consolidate logic now duplicated between:
  - `FeatureDropdown._flattenTree()`
  - `Model` feature tree helpers
- Expose helpers such as:
  - `flattenFeatureTree(node)`
  - `buildFeatureDropdownEntries(tree, features)`
- Keep rendering in `FeatureDropdown`, but feed it normalized entries.

### Target Outcome

There should be one authoritative implementation for feature-tree traversal.

### Manual Test

- Feature dropdown labels remain unchanged.
- Nested feature groups still render in the same order.
- Feature tooltips still show descriptions and units.

### Commit

`refactor(feature): deduplicate feature tree helpers`


## Step 12: Split Feature Controller From Feature Dropdown View

### Scope

Make `Feature` a thinner controller and reduce UI rendering responsibilities.

### Changes

- Move dropdown DOM rendering into a dedicated module:
  - `js/feature-dropdown.js` or `js/core/feature-dropdown-view.js`
- Keep `Feature` responsible for:
  - reacting to dispatcher events
  - loading selected features
  - updating state
  - dispatching feature events
- Move bucket dropdown population details out of `Feature.setBucket()`.
- If useful, add a small helper for resolving selected feature kind:
  - region feature vs volume feature

### Target Outcome

`Feature` becomes a controller with explicit dependencies instead of a mixed controller/view.

### Manual Test

- Switching buckets still updates the feature dropdown.
- Selecting and deselecting features still works.
- Removing a local feature still refreshes the dropdown correctly.

### Commit

`refactor(feature): split controller and dropdown view`


## Step 13: Extract Feature Selection Flow

### Scope

Remove repeated selection/download/prefetch behavior from the `Feature` class.

### Changes

- Create `js/feature-selection-service.js`.
- Move into it the sequence for:
  - load feature payload
  - determine whether feature is volume
  - update selected feature state
  - trigger prefetch
- Let `Feature` call the service from:
  - dropdown change
  - bucket switch restore
  - refresh flow

### Target Outcome

Feature selection behavior becomes easier to reason about and reuse.

### Manual Test

- Selecting a feature still updates all dependent panels.
- Refreshing a bucket with a selected feature still restores that selection.
- Prefetch still occurs after selection.

### Commit

`refactor(feature): extract selection flow`


## Step 14: Split Panel Export Logic Out Of Panel

### Scope

Remove the heavy export workflow from the general controls module.

### Changes

- Create `js/panel-export.js` or `js/export-svgs.js`.
- Move from `js/panel.js`:
  - SVG cloning with resolved fill colors
  - canvas rasterization
  - zip generation
- Keep `Panel` responsible only for binding the export button to the service.

### Target Outcome

`Panel` stops carrying an unrelated async export pipeline.

### Manual Test

- Export button still produces the same ZIP output.
- Control panel still works normally after export.

### Commit

`refactor(panel): extract svg export workflow`


## Step 15: Split Panel Control Logic From Panel Actions

### Scope

Separate persistent controls from one-off action buttons.

### Changes

- Create `js/panel-controls.js` for mapping/stat/cmap/log-scale/range behavior.
- Create `js/panel-actions.js` for:
  - reset
  - clear cache
  - share
  - connect
  - export button binding
- Keep `Panel` as a thin composition wrapper if desired, or replace it with smaller modules if the wiring stays simple.

### Target Outcome

Control syncing and action-button side effects stop competing in the same class.

### Manual Test

- Mapping/stat/cmap/range changes still propagate.
- Reset, share, connect, clear cache still function.
- Feature-driven colormap syncing still works.

### Commit

`refactor(panel): split controls and actions`


## Step 16: Extract Volume Session State

### Scope

Separate the loaded volume state from rendering and event handling.

### Changes

- Create `js/volume-session.js`.
- Move from `js/volume.js`:
  - loaded array metadata
  - axis mapping state
  - downsample state
  - active volume selection
  - array reset and assignment logic
- Keep `Volume` as the event-facing controller.

### Target Outcome

The mutable state of the volume pipeline becomes explicit and reusable.

### Manual Test

- Selecting a volume feature still shows the canvas overlays.
- Switching away from a volume feature still clears the volume state.
- Slice slider ranges still update correctly for dynamic volume shapes.

### Commit

`refactor(volume): extract volume session state`


## Step 17: Extract Volume Canvas Rendering

### Scope

Move low-level canvas drawing out of the main volume controller.

### Changes

- Create `js/volume-canvas-renderer.js`.
- Move from `js/volume.js`:
  - `makeImageData()`
  - `updateCanvasSizes()`
  - `drawSlice()`
  - any full redraw loop
- Pass in only the state needed for rendering:
  - volume data
  - axis mapping
  - colormap rgb values
  - slice indices
  - canvas elements

### Target Outcome

Canvas drawing becomes a separate rendering unit rather than being interleaved with dispatcher logic.

### Manual Test

- Volume slices still render correctly in all three axes.
- Colormap and range changes still redraw correctly.
- Performance feels unchanged or better.

### Commit

`refactor(volume): extract canvas renderer`


## Step 18: Extract Volume Interaction Logic

### Scope

Separate hover/value lookup from volume setup and rendering.

### Changes

- Create `js/volume-interaction.js`.
- Move from `js/volume.js`:
  - hover coordinate conversion
  - value lookup
  - tooltip/value dispatch support
- Keep only dispatcher bindings in `Volume`.

### Target Outcome

Volume hover behavior becomes isolated and easier to debug.

### Manual Test

- Hovering volume slices still updates tooltip/value behavior.
- Slice movement and hover remain aligned.
- No stale hover behavior after switching features.

### Commit

`refactor(volume): extract interaction logic`


## Step 19: Simplify Slice DOM Binding

### Scope

Reduce the amount of DOM wiring and repeated event setup in `Slice`.

### Changes

- Create `js/slice-dom.js` or `js/core/slice-dom.js`.
- Move out of `js/slice.js`:
  - DOM element lookup for line markers and coordinates
  - repeated SVG event binding patterns
  - wheel and input wiring helpers
- Keep slice state transitions and dispatch behavior in `Slice`.

### Target Outcome

`Slice` becomes about slice state and guide updates, not raw DOM hookup.

### Manual Test

- Sliders still move slices.
- Mouse wheel over slice panels still works.
- Hover and selection on SVG regions still work.

### Commit

`refactor(slice): extract dom bindings`


## Step 20: Split Region View From Region Policy

### Scope

Separate region list rendering/sorting from mapping fallback policy.

### Changes

- Keep or improve `RegionList` as the view.
- Move the mapping compatibility fallback from `Region` into a helper/service, for example:
  - `resolveCompatibleMappingForFeature()`
- Move sort UI helpers into a separate small module if it simplifies the file.

### Target Outcome

`Region` becomes easier to read and focused on orchestration.

### Manual Test

- Region list still renders.
- Sort still cycles through the same orders.
- Features with missing current mapping still auto-switch correctly.

### Commit

`refactor(region): separate view and mapping policy`


## Step 21: Cleanup Pass And API Tightening

### Scope

Normalize public interfaces after the extractions are complete.

### Changes

- Remove obsolete passthrough methods if no longer valuable.
- Standardize naming:
  - `getFeaturePayload`
  - `getFeatureHistogram`
  - `getFeatureMappings`
  where useful and only when the rename cost is justified
- Remove dead methods and commented-out code discovered during the refactor.
- Replace remaining direct mutable field writes on `state` with setters where practical.
- Add a short section to `docs/frontend-architecture.md` reflecting the final structure.

### Target Outcome

The extracted modules should look intentional rather than transitional.

### Manual Test

- Full app smoke test:
  - boot
  - bucket switch
  - feature select
  - mapping/stat/cmap change
  - slice movement
  - hover/select
  - volume feature render
  - share/reset
  - Unity load if relevant

### Commit

`refactor(frontend): cleanup and tighten module interfaces`


## Notes On Scope Control

To keep this safe, avoid the following during the early steps:

- no event bus redesign
- no framework migration
- no TypeScript conversion
- no large renames across the entire app unless the payoff is immediate
- no behavior changes bundled with structural refactors

If we later want a bigger architectural cleanup, that should be a separate phase after this plan is complete.


## Recommended Execution Order

Follow the steps in the order written.

The highest-value checkpoints are:

1. state split completed through Step 4
2. app composition split completed through Step 6
3. model split completed through Step 10
4. volume split completed through Step 18

At each checkpoint, pause and do a broader manual smoke test before continuing.
