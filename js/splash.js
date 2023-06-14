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
        splash, url, process, [download_splash, process_splash, store_splash],
    ) {
        console.assert(splash);
        console.assert(url);

        this.items = {};
        this.splash = splash;
        this.url = url;
        this.process = process; // a function

        // Splash progress for the different steps.
        this.download_splash = download_splash; // a number
        this.process_splash = process_splash; // a number
        this.store_splash = store_splash; // a number

        // Total splash.
        this.total_splash = download_splash + process_splash + store_splash;
        this.splash.addTotal(this.total_splash);
    }

    async start() {

        console.debug(`downloading ${this.url}...`)

        let dl = await downloadJSON(this.url);
        this.splash.add(this.download_splash);

        console.debug(`done downloading ${this.url}`)

        // Handle undefined process function.
        let items = dl;
        if (this.process)
            items = this.process(dl);
        this.splash.add(this.process_splash);

        let n = Object.keys(items).length;
        console.assert(items);
        console.assert(n > 0);
        console.debug(`adding ${n} items.`)
        this.items = items;

        this.splash.add(this.store_splash);
        console.debug(`done adding items.`);

    }

    get(key) {
        console.assert(this.items);
        // if (!this.items.includes(key)) console.warn(`${key} not in items`)
        return this.items[key];
    }
};
