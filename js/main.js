"use strict";

import { App } from "./app.js";


// Entry-point.
window.addEventListener('load', () => {

    // service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {

                // DEBUG: force refresh
                registration.update();

                console.debug('service worker registered');
            })
            .catch((error) => {
                console.error('service worker registration failed:', error);
            });
    }

    // Create the app.
    window.app = new App();
    window.app.init();
});
