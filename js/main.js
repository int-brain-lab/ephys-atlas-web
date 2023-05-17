"use strict";

import { App } from "./app.js";


// Entry-point.
window.addEventListener('load', () => {

    // service worker
    if ('serviceWorker' in navigator) {

        // Needed or not??
        // // Unregister the existing service worker.
        // navigator.serviceWorker.getRegistrations().then((registrations) => {
        //     registrations.forEach((registration) => {
        //         registration.unregister();
        //     });
        // });

        // Register the service worker.
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
