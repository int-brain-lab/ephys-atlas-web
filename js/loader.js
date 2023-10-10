export { Loader };

import { downloadJSON } from "./utils.js";



/*************************************************************************************************/
/* Loader                                                                                        */
/*************************************************************************************************/

class Loader {
    // Store a JSON file from a URL and put it in memory. Provide a get(key) function.
    // Used for simple key-value mappings.
    constructor(
        splash, url, [downloadSplash, storeSplash],
    ) {
        console.assert(splash);
        console.assert(url);

        this.starting = false;
        this.items = {};
        this.splash = splash;
        this.url = url;

        // Splash progress for the different steps.
        this.downloadSplash = downloadSplash; // a number
        this.storeSplash = storeSplash; // a number

        // Total splash.
        this.totalSplash = downloadSplash + storeSplash;
        this.splash.addTotal(this.totalSplash);
    }

    async start(refresh = false) {
        console.debug(`loader downloading ${this.url}...`)

        let n = Object.keys(this.items).length;

        let dl = await downloadJSON(this.url, refresh);
        this.splash.add(this.downloadSplash);

        console.debug(`done downloading ${this.url}`)

        let items = dl;

        if (items) {
            n = Object.keys(items).length;
            console.assert(items);
            console.assert(n > 0);
            console.debug(`adding ${n} items.`)
            this.items = items;

            this.splash.add(this.storeSplash);
            console.debug(`done adding items.`);
        }
    }

    get(key) {
        console.assert(this.items);
        return this.items[key];
    }
};
