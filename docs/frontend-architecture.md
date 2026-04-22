# Frontend architecture

This document describes how the JavaScript frontend in the IBL ephys atlas web app is currently organized, how data flows through it, and which files are most important when making changes.

The frontend is a **plain JavaScript ES-module application**. It does not use React, Vue, or another UI framework. Instead, it is organized around:

- a shared application state object
- a shared data/model layer
- a lightweight event bus
- a set of modules that each manage one part of the UI or rendering pipeline
- a growing helper/service layer extracted from older monolithic modules

## Current refactor status

The frontend refactor is no longer just a plan: the main structural extractions have already landed in the active codebase.

Current architectural direction:

- keep top-level modules as thin controllers that wire DOM events, shared state, and dispatcher events
- move pure decision logic into `js/core/*` helpers
- move data, persistence, and policy concerns into focused service-style modules rather than growing `app.js`, `state.js`, or `model.js`
- preserve the existing event-driven architecture unless a change clearly justifies broader redesign

In practice, this means that when you change behavior, you should usually inspect both:

- the UI/controller module, and
- any corresponding extracted helper/service module it now depends on

---

## 1. High-level mental model

The easiest way to understand the frontend is:

1. `main.js` starts the app in the browser
2. `app.js` exposes the public `App` entrypoint
3. `app-services.js` builds shared services
4. `app-modules.js` builds feature/view modules
5. `app-lifecycle.js` runs the startup phases
6. `state.js` stores the current UI/application state
7. `model.js` loads and caches data
8. `dispatcher.js` sends events between modules
9. feature-specific modules react to events and update the DOM

In short, the frontend is an **event-driven app built on shared `state + model + dispatcher` objects**, with composition and helper logic extracted into smaller files.

---

## 2. Startup flow

### `js/main.js`

Browser entrypoint.

It:

- unregisters service workers
- performs a mobile check
- creates `window.app = new App()`
- calls `app.init()`

### `js/app.js`

Thin public app wrapper.

It delegates almost all construction and initialization behavior to:

- `js/app-services.js`
- `js/app-modules.js`
- `js/app-lifecycle.js`

So `App` is now intentionally small and mostly exposes the public composition root used by `main.js`.

### `js/app-services.js`

Creates the shared long-lived services:

- `Splash`
- `State`
- `Model`
- `Dispatcher`

### `js/app-modules.js`

Creates the feature/view modules from the shared services:

- `Bucket`
- `Feature`
- `Region`
- `Selection`
- `Selector`
- `Colorbar`
- `Coloring`
- `Highlighter`
- `Help`
- `DotImage`
- `Maximizer`
- `Panel`
- `Search`
- `Share`
- `Slice`
- `Spinner`
- `Tooltip`
- `Unity`
- `Volume`
- `StatToolbox`
- `LocalSocket`

### `js/app-lifecycle.js`

Contains the startup phases.

The current flow is:

1. start splash/loading
2. load static model data
3. suspend URL updates
4. initialize primary UI modules
5. initialize dependent UI modules
6. resume URL updates
7. initialize deferred modules such as Unity if enabled

A few startup dependencies are worth preserving:

- URL updates stay suspended during startup so initialization does not churn the location bar
- `selection.init()` currently runs after `region.init()`
- Unity initialization remains deferred until the rest of the app is initialized

---

## 3. Core frontend architecture

### `js/state.js`

This is the shared application/UI state.

It stores things like:

- current bucket and list of available buckets
- selected feature name
- whether the selected feature is a volume feature
- selected mapping (`allen`, `beryl`, `cosmos`)
- selected statistic (`mean`, `median`, etc.)
- colormap and colormap range
- slice indices (`coronal`, `sagittal`, `horizontal`)
- 3D exploded-view value
- selected and highlighted regions
- panel open/closed state

`State` now delegates part of its previous responsibilities to extracted modules:

- `js/state-defaults.js` — default constants and alias definitions
- `js/state-router.js` — browser URL parsing/serialization/history integration
- `js/core/state-normalize.js` — pure normalization of the in-memory state shape
- `js/core/state-url.js` — low-level URL state parsing/serialization helpers

So `State` is still central, but it is now more focused on the mutable in-memory session state.

### `js/model.js`

This is the data/model layer.

It is responsible for orchestrating and exposing:

- colormaps
- regions metadata
- per-axis slice SVG data
- bucket metadata
- feature payloads
- volume data

Important features of `Model`:

- wraps remote/static loads behind a stable API
- delegates bucket/feature transport to `DataClient`
- delegates bucket/feature cache and persistence policy to `FeatureStore`
- delegates background feature prefetch scheduling to `PrefetchController`
- delegates static atlas resources, feature catalog policy, feature payload accessors, and prefetch policy to focused helper modules

Modules should generally ask the `model` for data instead of fetching directly.

The current split is:

- `js/model.js` — facade/orchestration layer used by the UI
- `js/data-client.js` — raw HTTP access for buckets/features
- `js/feature-store.js` — in-memory + persistent cache policy and local bucket handling
- `js/prefetch-controller.js` — prefetch queueing, idle scheduling, and cancellation
- `js/atlas-static-store.js` — static colormap, region, and slice resources
- `js/feature-catalog.js` — ordered-feature and volume-feature catalog helpers
- `js/feature-payload.js` — feature payload accessors for mappings, histograms, colormaps, and volumes
- `js/feature-prefetch-policy.js` — feature prefetch candidate selection

### `js/dispatcher.js`

This is the event bus.

It uses a hidden DOM element (`#dispatcher`) and `CustomEvent`s to decouple modules.

Common events include:

- `bucket`
- `feature`
- `mapping`
- `stat`
- `slice`
- `highlight`
- `toggle`
- `clear`
- `refresh`
- `cmap`
- `cmapRange`
- `volumeHover`
- `volumeValues`
- `share`

Modules usually communicate by:

1. updating shared state
2. emitting an event through `dispatcher`
3. letting other modules react independently

### Help modal

The frontend now also includes a small `Help` UI module that opens a scrollable modal from the header.
Its body content is loaded from the separate editable file `help/help-content.html`, with presentation styles in `css/help.css`.

This remains one of the key patterns in the codebase.

---

## 4. Data flow pattern

A typical interaction looks like this:

1. the user changes something in the UI
2. a module updates `state`
3. that module emits an event via `dispatcher`
4. multiple listening modules update their own DOM/rendering/data views

### Example: selecting a feature

1. `Feature` handles the dropdown change
2. it downloads feature data through `model` if needed
3. it updates:
   - `state.fname`
   - `state.isVolume`
4. it emits `dispatcher.feature(...)`
5. listeners react:
   - `Coloring` recolors regions
   - `Colorbar` redraws histogram/colorbar
   - `Region` updates the bar plot list
   - `Volume` shows or hides raster volume overlays
   - `Unity` updates 3D region colors
   - `Panel` refreshes related controls

This event-driven fan-out is how most frontend state changes propagate.

One result of the refactor is that many pure decisions inside those fan-out paths now live in `js/core/*` or small service modules, while the top-level modules stay responsible for wiring, rendering, and side effects.

---

## 5. Module groups

The JS code is easiest to navigate in groups.

### A. App/core infrastructure

- `js/main.js` — browser entrypoint
- `js/app.js` — thin public app wrapper
- `js/app-services.js` — shared service construction
- `js/app-modules.js` — feature/view module construction
- `js/app-lifecycle.js` — startup phase orchestration
- `js/state.js` — shared app state
- `js/model.js` — facade/orchestration layer for data access
- `js/data-client.js` — raw bucket/feature transport
- `js/atlas-static-store.js` — static colormap, region, and slice resources
- `js/feature-store.js` — bucket/feature cache and persistence layer
- `js/prefetch-controller.js` — background prefetch queue and cancellation
- `js/feature-catalog.js` — bucket feature ordering and volume-feature detection
- `js/feature-payload.js` — feature payload accessors
- `js/feature-prefetch-policy.js` — feature prefetch candidate selection
- `js/state-defaults.js` — default state constants and alias definitions
- `js/state-router.js` — URL parse/serialize and history integration
- `js/dispatcher.js` — event bus
- `js/cache.js` — async cache wrapper
- `js/loader.js` — loader for static JSON resources
- `js/utils.js` — common helpers
- `js/constants.js` — runtime constants and coordinate helpers

### B. Controls and top-level interactions

- `js/bucket.js` — bucket dropdown, add/remove/refresh/upload
- `js/feature.js` — feature controller
- `js/feature-dropdown.js` — feature dropdown rendering/view helper
- `js/feature-selection-service.js` — feature loading/selection flow
- `js/panel.js` — panel composition/wiring
- `js/panel-controls.js` — mapping/stat/colormap/log-scale/range controls
- `js/panel-actions.js` — reset/share/connect/export/clear-cache actions
- `js/panel-export.js` — SVG export workflow
- `js/search.js` — search box behavior
- `js/share.js` — syncing app state into shareable URLs
- `js/maximizer.js` — maximizing/minimizing panels
- `js/spinner.js` — busy cursor handling
- `js/splash.js` — loading overlay/progress

### C. Region list / selection / interaction overlays

- `js/region.js` — region list orchestration and feature-to-mapping compatibility handling
- `js/region-view.js` — region list rendering and sort interactions
- `js/region-policy.js` — mapping compatibility policy for selected features
- `js/selection.js` — selected region list
- `js/selector.js` — selected-region CSS styling
- `js/highlighter.js` — hover highlight styling
- `js/tooltip.js` — tooltip contents and placement

### D. Coloring and statistics

- `js/coloring.js` — region coloring by feature/stat/cmap
- `js/colorbar.js` — histogram + colorbar summary
- `js/stattoolbox.js` — per-region violin/statistical comparison tool

### E. Slice and volume rendering

- `js/slice.js` — slice state, guide updates, and dispatcher orchestration
- `js/slice-dom.js` — slice DOM lookup and event binding helpers
- `js/volume.js` — volume controller and dispatcher integration
- `js/volume-session.js` — volume session state and axis-mapping setup
- `js/volume-canvas-renderer.js` — canvas sizing and raster slice drawing
- `js/volume-interaction.js` — volume hover/value lookup helpers
- `js/dotimage.js` — ctrl-click volume point/image lookup utilities

### F. 3D integration

- `js/unity.js` — Unity/WebGL bridge

### G. Socket/connectivity helper

- `js/socket.js` — connection-related behavior used by the frontend

### H. Refactor helper layer

The frontend now has a meaningful `js/core/` helper layer.

Representative helpers include:

- `js/core/events.js` — shared event name constants
- `js/core/dom.js` — required-element / stylesheet lookup helpers
- `js/core/state-normalize.js` — pure app-state normalization
- `js/core/state-url.js` — low-level URL parsing/serialization helpers
- `js/core/feature-tree.js` — feature tree traversal and dropdown entry building
- `js/core/coloring-helpers.js` — CSS color-rule and coloring-view derivation
- `js/core/colorbar-helpers.js` — colorbar range and histogram-source resolution
- `js/core/panel-helpers.js` — colormap-range display derivation and cleared-state URL logic
- `js/core/region-helpers.js` — search/filter/title/sort helpers for the region list
- `js/core/slice-helpers.js` — slice guide-line and wheel-step logic
- `js/core/volume-helpers.js` — volume indexing, hover coordinates, and denormalization
- `js/core/volume-ui-helpers.js` — UI-facing slice index helpers for dynamic volume sizing
- `js/core/dotimage-helpers.js` — point projection and nearest-point lookup

A practical reading pattern is: understand the UI module, then check whether the pure logic it relies on has already been moved into `js/core/*` or a small extracted service module.

---

## 6. The most important modules to understand first

If you are new to the repo, read these first:

1. `js/main.js`
2. `js/app.js`
3. `js/app-services.js`
4. `js/app-modules.js`
5. `js/app-lifecycle.js`
6. `js/state.js`
7. `js/dispatcher.js`
8. `js/model.js`
9. `js/panel.js`
10. `js/feature.js`
11. `js/region.js`
12. `js/slice.js`
13. `js/volume.js`
14. `js/unity.js`

That gives a good picture of the app without reading every file in full.

A useful secondary rule after the refactor is: for any non-trivial UI module, also inspect the matching `js/core/*` helper file or extracted service module before changing behavior.

---

## 7. Rendering architecture

### SVG-based slice views

The app uses precomputed SVG slices for anatomical/region views. `Slice` swaps slice SVG markup into the relevant containers based on current axis/slider position.

This is how non-volume feature interaction works:

- hover over SVG path → identify region index
- click SVG path → toggle selected region
- emit highlight/toggle events
- other modules update styles/tooltips/selection lists

### Canvas-based volume overlays

When the selected feature is volumetric, `Volume` overlays raster data onto canvases aligned with the slice views.

Important behavior in the current volume pipeline:

- `Volume` owns dispatcher integration and overall orchestration
- `VolumeSession` stores loaded array metadata, axis mappings, downsampling, and active volume selection
- `VolumeCanvasRenderer` handles canvas sizing and raster slice drawing
- `volume-interaction.js` handles hover/value lookup helpers
- the renderer infers axis permutation and downsampling relative to canonical volume dimensions
- canvases resize to match actual voxel plane sizes

So the slice system is effectively:

- **SVG for anatomy/regions**
- **canvas for voxel data**
- both visually layered together

### Unity/WebGL

`Unity` is a separate rendering target.

The frontend sends Unity:

- region names/acronyms
- colors for each visible region
- exploded-view amount
- visibility masks based on selected regions

So Unity follows frontend state rather than owning its own state model.

---

## 8. Styling strategy

The frontend uses both static CSS and dynamic CSS.

### Static CSS

- `css/main.css`
- generated region-color CSS files under `data/css/`

### Dynamic CSS injection

Several modules build styles at runtime by inserting CSS rules into `<style>` elements in the document:

- `Coloring` injects fill colors for regions
- `Highlighter` injects hover styles
- `Selector` injects selected-region styles
- `Volume` injects some overlay visibility rules

A lot of visual behavior is controlled by **generated CSS rules**, not only by direct DOM mutation.

---

## 9. Tests and validation support

The frontend now has a lightweight Node-based test suite under `tests/frontend/`.

This suite covers many extracted helpers and service modules, including:

- state normalization and URL helpers
- feature catalog / payload / prefetch policy helpers
- feature dropdown and selection flow
- panel export/helpers
- region helpers/view/policy
- slice DOM/helpers
- volume session / renderer / interaction / helper modules
- integration-oriented module smoke coverage

Useful commands:

- `npm run test:frontend`
- `just check`

This test suite is still not a full browser E2E harness, so manual smoke testing remains important after meaningful UI changes.

---

## 10. Local-development behavior

A few frontend behaviors are environment-sensitive:

- `js/constants.js` detects localhost and enables debug/local backend behavior
- on localhost, frontend points to `https://localhost:5000`
- the normal local frontend entrypoint is `https://localhost:8456`
- Unity is enabled by default
- `main.js` currently unregisters service workers on load

If something behaves differently locally than on production, `constants.js` is one of the first places to inspect.

---

## 11. Design strengths

Some genuinely useful properties of this frontend structure:

- simple architecture without framework overhead
- one shared state object makes the app easy to inspect mentally
- event bus keeps modules decoupled
- modules are split by UI concern, which helps maintenance
- data loading is centralized through `Model`
- `app.js` is now a very thin public wrapper
- state, model, panel, feature, region, slice, and volume logic have been split into smaller pieces
- volumetric rendering logic is split between `Volume`, `volume-session`, `volume-canvas-renderer`, and `volume-interaction`
- Unity integration is mostly contained in one module

---

## 12. Design tradeoffs / rough edges

Important things to keep in mind when modifying the frontend:

### Shared mutable state

Many modules mutate the same `state` object. This is simple, but it also means changes can have side effects that are not locally obvious.

### String-based dispatcher events

Dispatcher events are flexible, but event names and payload shapes are not type-checked.

### DOM structure is part of the API

Many modules depend on specific element IDs, class names, and static `<style>` tags already existing in `index.html`.

### Dynamic CSS can be hard to debug

Because styling often comes from injected rules, visual bugs may be caused by runtime CSS rather than the static stylesheet.

### `model.js` is now a facade, but remains central

`Model` is thinner than before, but it is still the main frontend integration surface. It coordinates the static store, feature store, catalog helpers, payload helpers, and prefetch layers, so changes to data flow should still start there.

### Slice geometry is partly modernized, partly legacy

The volume system has been made more dynamic, but some crosshair/line positioning in `slice.js` still relies on older fixed/viewBox assumptions.

---

## 13. Practical advice when changing the frontend

### If you are changing controls

Start with:

- `js/panel.js`
- `js/panel-controls.js`
- `js/panel-actions.js`
- `js/feature.js`
- `js/feature-dropdown.js`
- `js/feature-selection-service.js`
- `js/bucket.js`
- `js/search.js`

### If you are changing selection/hover behavior

Start with:

- `js/region.js`
- `js/region-view.js`
- `js/region-policy.js`
- `js/slice.js`
- `js/slice-dom.js`
- `js/highlighter.js`
- `js/selector.js`
- `js/tooltip.js`

### If you are changing colors/statistics

Start with:

- `js/coloring.js`
- `js/colorbar.js`
- `js/stattoolbox.js`
- `js/model.js`
- relevant `js/core/*` helper modules

### If you are changing slice or volume rendering

Start with:

- `js/slice.js`
- `js/slice-dom.js`
- `js/volume.js`
- `js/volume-session.js`
- `js/volume-canvas-renderer.js`
- `js/volume-interaction.js`
- `js/constants.js`
- `js/dotimage.js`

### If you are changing the 3D view

Start with:

- `js/unity.js`
- relevant Unity/WebGL assets under `Unity/`, `Build/`, and `StreamingAssets/`

---

## 14. Minimal validation checklist after frontend changes

After meaningful frontend edits, check the relevant subset of:

- app boots cleanly
- bucket list and feature dropdown load correctly
- switching buckets keeps the feature list and selected state coherent
- mapping/stat/colormap/range controls still propagate correctly
- slice sliders and mouse-wheel navigation still work
- region hover and selection still work
- volume features still render and hover values remain aligned
- share/reset/export flows still work if touched
- Unity still loads if your change could affect it
- `npm run test:frontend` stays green for helper/service changes
- browser console stays reasonably clean
