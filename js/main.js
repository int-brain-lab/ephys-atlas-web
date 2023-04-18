"use strict";

import { App } from "./app.js";


window.addEventListener("load", async (event) => {
    // Create the app.
    window.app = new App();
    window.app.init();
});
