# Frontend architecture

The document describes how the JavaScript frontend in the IBL ephys atlas web app is organized, how data flows through it, and which files are most important when making changes.

## Refactor direction

When extending or refactoring the frontend, prefer these boundaries:

- keep top-level modules as thin controllers that wire DOM events, shared state, and dispatcher events
- move pure decision logic into `js/core/*` helpers
- move data, persistence, and policy concerns into focused service-style modules rather than growing `app.js`, `state.js`, or `model.js`
- preserve the existing event-driven architecture unless a change clearly justifies broader redesign

In practice, the preferred direction is small extractions that reduce the number of reasons a module must change, while keeping public behavior stable.

The frontend is a **plain JavaScript ES-module application**. It does not use React, Vue, or another UI framework. Instead, it is organized around:

- a shared application state object
- a shared data/model layer
- a lightweight event bus
- a set of modules that each manage one part of the UI or rendering pipeline

---

## 1. High-level mental model

The easiest way to understand the frontend is:

1. `main.js` starts the app in the browser
2. `app.js` creates all major modules
3. `state.js` stores the current UI/application state
4. `model.js` loads and caches data
5. `dispatcher.js` sends events between modules
6. feature-specific modules react to events and update the DOM

In short, the frontend is an **event-driven app built on shared `state + model + dispatcher` objects**.

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

Composition root for the frontend.

It creates the shared core objects:

- `Splash`
- `State`
- `Model`
- `Dispatcher`

It then creates the feature/view modules:

- `Bucket`
- `Feature`
- `Region`
- `Selection`
- `Selector`
- `Colorbar`
- `Coloring`
- `Highlighter`
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

Its `init()` method:

1. starts the splash/loading flow
2. calls `model.load()`
3. temporarily disables URL updates
4. initializes primary UI modules
5. initializes dependent UI modules
6. re-enables URL updates
7. initializes deferred modules such as Unity if enabled

A few startup dependencies are worth preserving during refactors:

- URL updates stay suspended during startup so initialization does not churn the location bar
- `selection.init()` currently runs after `region.init()`
- Unity initialization remains deferred until the rest of the app is initialized

`App` mostly wires the rest of the application together.

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

It also handles URL serialization:

- reading initial state from the URL
- writing state back into the URL
- predefined alias states

So `State` is the session state of the current atlas view.

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
- `js/feature-catalog.js` — ordered-feature and volume-feature catalog helpers
- `js/feature-payload.js` — feature payload accessors for mappings, histograms, colormaps, and volumes

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

This is one of the key patterns in the codebase.

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

One result of the recent refactor work is that many of the pure decisions inside those fan-out paths now live in `js/core/*`, while the top-level modules stay responsible for wiring, rendering, and side effects.

---

## 5. Module groups

The JS code is easiest to navigate in groups.

### A. App/core infrastructure

- `js/main.js` — browser entrypoint
- `js/app.js` — app wiring/composition root
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
- `js/feature.js` — feature dropdown and feature selection
- `js/panel.js` — mapping/stat/colormap/log-scale/export/share/reset controls
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

The frontend now also has a meaningful `js/core/` helper layer that was introduced through the recent refactor work.

Representative helpers include:

- `js/core/events.js` — shared event name constants
- `js/core/dom.js` — required-element / stylesheet lookup helpers
- `js/core/state-normalize.js` — pure app-state normalization
- `js/core/coloring-helpers.js` — CSS color-rule and coloring-view derivation
- `js/core/colorbar-helpers.js` — colorbar range and histogram-source resolution
- `js/core/panel-helpers.js` — colormap-range display derivation and cleared-state URL logic
- `js/core/region-helpers.js` — search/filter/title/sort helpers for the region list
- `js/core/slice-helpers.js` — slice guide-line and wheel-step logic
- `js/core/volume-helpers.js` — volume indexing, hover coordinates, and denormalization
- `js/core/dotimage-helpers.js` — point projection and nearest-point lookup

A practical reading pattern is: understand the UI module, then check whether the pure logic it relies on has already been moved into `js/core/*`.

---

## 6. The most important modules to understand first

If you are new to the repo, read these first:

A useful secondary rule after the recent refactor is: for any non-trivial UI module, also inspect the matching `js/core/*` helper file or extracted service module before changing behavior. Many calculations that used to be inline have been extracted there and are covered by frontend node tests under `tests/frontend/`.


1. `js/main.js`
2. `js/app.js`
3. `js/state.js`
4. `js/dispatcher.js`
5. `js/model.js`
6. `js/panel.js`
7. `js/feature.js`
8. `js/region.js`
9. `js/slice.js`
10. `js/volume.js`
11. `js/unity.js`

That gives a good picture of the app without reading every file in full.

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

Important behavior in `Volume`:

- detect whether feature payload contains volume arrays
- decode/use volume arrays from model data
- infer axis permutation and downsampling relative to canonical volume dimensions
- resize canvases to match actual voxel plane sizes
- render slice planes into `ImageData`
- update raster overlays when slice position or colormap changes

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

This is an important pattern in the codebase. A lot of visual behavior is controlled by **generated CSS rules**, not only by direct DOM mutation.

---

## 9. Local-development behavior

A few frontend behaviors are environment-sensitive:

- `js/constants.js` detects localhost and enables debug/local backend behavior
- on localhost, frontend points to `https://localhost:5000`
- the normal local frontend entrypoint is `https://localhost:8456`
- Unity is enabled by default
- `main.js` currently unregisters service workers on load

If something behaves differently locally than on production, `constants.js` is one of the first places to inspect.

---

## 10. Design strengths

Some genuinely useful properties of this frontend structure:

- simple architecture without framework overhead
- one shared state object makes the app easy to inspect mentally
- event bus keeps modules decoupled
- modules are split by UI concern, which helps maintenance
- data loading is centralized through `Model`
- volumetric rendering logic is split between `Volume`, `volume-session`, `volume-canvas-renderer`, and `volume-interaction`
- Unity integration is mostly contained in one module

---

## 11. Design tradeoffs / rough edges

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

## 12. Practical advice when changing the frontend

### If you are changing controls

Start with:

- `js/panel.js`
- `js/bucket.js`
- `js/feature.js`
- `js/search.js`

### If you are changing selection/hover behavior

Start with:

- `js/region.js`
- `js/slice.js`
- `js/highlighter.js`
- `js/selector.js`
- `js/tooltip.js`

### If you are changing colors/statistics

Start with:

- `js/coloring.js`
- `js/colorbar.js`
- `js/stattoolbox.js`
- `js/model.js`

### If you are changing slice or volume rendering

Start with:

- `js/slice.js`
- `js/volume.js`
- `js/constants.js`
- `js/dotimage.js`

### If you are changing the 3D view

Start with:

- `js/unity.js`
- relevant Unity/WebGL assets under `Unity/`, `Build/`, and `StreamingAssets/`

---

## 13. Minimal validation checklist after frontend changes

Because automated testing is limited, validate manually in the browser.

At minimum, check:

- app loads without obvious console errors
- bucket dropdown works
- feature selection works
- mapping/stat/cmap controls still update the app
- region list updates correctly
- hovering regions shows sensible tooltips
- selecting regions updates the selection UI and highlighting
- coronal / sagittal / horizontal slice views still render and respond
- volumetric overlays still align well enough if relevant
- Unity/WebGL still loads if your change could affect it

---

## 14. Summary

The frontend is best understood as:

- a **shared state object**
- a **shared data/model layer**
- a **custom event bus**
- many **small UI/rendering modules** reacting to those events

It is simple, modular, and practical, but it relies heavily on implicit contracts between state, events, DOM structure, and generated CSS.
