"use strict";

import { DB } from "./db.js";
import { App } from "./app.js";


window.addEventListener("load", async (event) => {
    // Load the data.
    let db = new DB();
    await db.load();

    // Create the app.
    let app = new App(db);
    window.app = app;
});
