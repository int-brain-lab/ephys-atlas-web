export { Splash, Loader };

import { downloadJSON } from "./utils.js";



/*************************************************************************************************/
/* Splash                                                                                        */
/*************************************************************************************************/

class Splash {
    constructor() {
        this.progress = 0;
        this.total = 0;
        this.splash = document.getElementById('splash');
        this.loading = document.querySelector('#splash-loading span.progress');
    }

    addTotal(total) {
        this.total += total;
    }

    setLoading(is_loading) {
        this.splash.style.display = is_loading ? 'block' : 'none';
    }

    start() {
        this.set(0);
    }

    end() {
        this.set(this.total);
    }

    add(x) {
        this.set(this.progress + x);
    }

    set(value) {
        if (!this.total) {
            console.error("you need to call addTotal() at least once");
            return;
        }

        // Set the progress value.
        this.progress = value;

        // Update the splash loading percentage.
        this.loading.innerHTML = (100 * value / this.total).toFixed(1);

        // Display or hide the loading splash.
        this.setLoading(value < this.total);
    }
};



/*************************************************************************************************/
/* Loader                                                                                        */
/*************************************************************************************************/

class Loader {
    // Store a JSON file from a URL and put it in memory. Provide a get(key) function.
    // Used for simple key-value mappings.
    constructor(
        splash, url, process, [downloadSplash, processSplash, storeSplash],
    ) {
        console.assert(splash);
        console.assert(url);

        this.starting = false;
        this.items = {};
        this.splash = splash;
        this.url = url;
        this.process = process; // a function
        this.state = "pending"; // then "downloading" then "done"

        // Splash progress for the different steps.
        this.downloadSplash = downloadSplash; // a number
        this.processSplash = processSplash; // a number
        this.storeSplash = storeSplash; // a number

        // Total splash.
        this.totalSplash = downloadSplash + processSplash + storeSplash;
        this.splash.addTotal(this.totalSplash);
    }

    async start() {
        // NOTE: this avoids multiple downloads when there are concurrent calls to this function
        // for example when multiple components call "model.getFeatures()".
        if (this.state != "pending") return;
        let n = Object.keys(this.items).length;

        console.debug(`loader downloading ${this.url}...`)

        this.state = "downloading";
        let dl = await downloadJSON(this.url);
        this.splash.add(this.downloadSplash);

        console.debug(`done downloading ${this.url}`)

        // Handle undefined process function.
        let items = dl;
        if (this.process)
            items = this.process(dl);
        this.splash.add(this.processSplash);

        if (items) {
            n = Object.keys(items).length;
            console.assert(items);
            console.assert(n > 0);
            console.debug(`adding ${n} items.`)
            this.items = items;

            this.splash.add(this.storeSplash);
            console.debug(`done adding items.`);
        }

        this.state = "done";
    }

    get(key) {
        console.assert(this.items);
        // if (!this.items.includes(key)) console.warn(`${key} not in items`)
        return this.items[key];
    }
};
