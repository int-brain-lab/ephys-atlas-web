# Frontend Refactor Status

This document is now a status record rather than a future-only plan.

The incremental frontend refactor described here has largely landed in the active codebase. The original goals were to improve maintainability without changing the overall architecture, avoid broad rewrites, and move pure logic or policy concerns out of large controller modules.

## Summary

The current codebase reflects the main intended refactor outcomes:

- `app.js` is now a thin wrapper over extracted composition/lifecycle files
- `state.js` is split from defaults, URL routing, and normalization helpers
- `model.js` is a thinner facade over focused data/policy modules
- feature selection and dropdown behavior are separated more cleanly
- panel control logic and panel action logic are separated
- volume state, rendering, and interaction responsibilities are separated
- slice DOM binding and region list view/policy logic are separated
- a meaningful `js/core/*` helper layer now exists
- a lightweight `tests/frontend/` suite covers many extracted pieces

This does **not** mean the frontend is architecturally “finished”; it means the planned structural extraction phase is effectively complete enough that the active docs should describe the current structure rather than a future one.

---

## Current status by area

### 1. App composition and startup

Implemented:

- `js/app-services.js`
- `js/app-modules.js`
- `js/app-lifecycle.js`
- thin `js/app.js`

Outcome:

- service construction, module construction, and startup phases are now explicit
- startup ordering is easier to follow and change safely

### 2. State split

Implemented:

- `js/state-defaults.js`
- `js/state-router.js`
- `js/core/state-normalize.js`
- `js/core/state-url.js`
- updated `js/state.js`

Outcome:

- defaults, URL handling, and normalization are no longer buried inside one file
- `State` is more clearly the mutable in-memory state container

### 3. Model split

Implemented:

- `js/atlas-static-store.js`
- `js/feature-catalog.js`
- `js/feature-payload.js`
- `js/feature-prefetch-policy.js`
- existing `js/data-client.js`
- existing `js/feature-store.js`
- existing `js/prefetch-controller.js`
- updated `js/model.js`

Outcome:

- `Model` remains central but is now mostly an orchestration facade
- data transport, static resource access, payload interpretation, cache policy, and prefetch policy are more isolated

### 4. Feature flow split

Implemented:

- `js/feature-dropdown.js`
- `js/feature-selection-service.js`
- `js/core/feature-tree.js`

Outcome:

- dropdown rendering and selection workflow are clearer and more reusable
- feature-tree traversal is more centralized

### 5. Panel split

Implemented:

- `js/panel-controls.js`
- `js/panel-actions.js`
- `js/panel-export.js`
- updated `js/panel.js`

Outcome:

- persistent controls no longer compete with export/reset/share/clear-cache actions inside one large module

### 6. Volume split

Implemented:

- `js/volume-session.js`
- `js/volume-canvas-renderer.js`
- `js/volume-interaction.js`
- updated `js/volume.js`

Outcome:

- session state, rendering, and interaction logic are now separated
- dynamic volume sizing and hover/value behavior are easier to reason about in isolation

### 7. Slice and region split

Implemented:

- `js/slice-dom.js`
- `js/region-view.js`
- `js/region-policy.js`

Outcome:

- DOM hookup and policy/view responsibilities are separated from top-level orchestration modules

### 8. Helper layer and tests

Implemented:

- expanded `js/core/*` helper modules
- `tests/frontend/` coverage for many extracted modules

Outcome:

- pure logic is easier to test without loading the full app
- the refactor is backed by lightweight automated checks, not only manual testing

---

## What remains true after the refactor

The refactor improved structure, but the core architecture is still the same:

- plain ES modules
- shared mutable `state`
- central `model` facade
- dispatcher/event-bus communication
- DOM-dependent modules
- dynamic CSS injection for several visual layers

So this work should be understood as a maintainability refactor, not a wholesale architectural replacement.

---

## Remaining rough edges

A few rough edges are still worth remembering:

- `state` is still shared and mutable across many modules
- dispatcher event payloads are still stringly typed
- DOM structure remains part of the effective module API
- some slice/crosshair positioning still reflects legacy assumptions
- `Model` is thinner, but still a major integration point

These are reasonable future cleanup targets, but they are outside the main completed extraction phase.

---

## Recommended doc stance going forward

Use `docs/frontend-architecture.md` as the authoritative description of the current frontend structure.

Treat this file as:

- a record that the extraction-oriented refactor has largely landed
- a reminder of the intended boundaries for future changes
- a place to note remaining cleanup themes if they become concrete work items

If a future frontend cleanup phase is proposed, create a new scoped plan rather than continuing to present this completed extraction phase as pending work.
