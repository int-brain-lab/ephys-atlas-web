"use strict";
// import { State } from "./state.js";

import { DB } from "./db.js";
import { App } from "./app.js";



// Load the data.
let db = new DB();
await db.load();

// Create the app.
let app = new App(db);
window.app = app;


// const ENABLE_UNITY = false;

// window.unity = null;


// setupSVGHighlighting('coronal');
// setupSVGHighlighting('sagittal');
// setupSVGHighlighting('horizontal');
// setupSVGHighlighting('top');
// setupSVGHighlighting('swanson');

// setupSVGSelection('coronal');
// setupSVGSelection('sagittal');
// setupSVGSelection('horizontal');
// setupSVGSelection('top');
// setupSVGSelection('swanson');

// setupBarHighlighting();
// setupBarSelection();

// setupSlider('coronal');
// setupSlider('sagittal');
// setupSlider('horizontal');

// setupSearchInput();
// setupFeatureSetDropdown();
// setupFeatureDropdown();
// setupColormapDropdown();
// setupColormapSliders();
// setupStatDropdown();
// setupControlButtons();

// if (ENABLE_UNITY) {
//     setupUnity();
// }
