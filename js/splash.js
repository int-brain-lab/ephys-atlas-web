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
    constructor(
        db, splash,
        table_name, url, process,
        [download_splash, process_splash, store_splash],
    ) {
        console.assert(db);
        console.assert(splash);
        console.assert(table_name);
        console.assert(url);

        this.db = db;
        this.splash = splash;
        this.url = url;
        this.process = process; // a function

        // DB table.
        this.table_name = table_name
        this.table = this.db.table(this.table_name);

        // Splash progress for the different steps.
        this.download_splash = download_splash; // a number
        this.process_splash = process_splash; // a number
        this.store_splash = store_splash; // a number

        // Total splash.
        this.total_splash = download_splash + process_splash + store_splash;
        this.splash.addTotal(this.total_splash);
    }

    async start() {

        let n = await this.table.count();

        if (n > 0) {
            this.splash.add(this.total_splash);
        }

        else {
            console.debug(`downloading ${this.url}...`)

            let dl = await downloadJSON(this.url);
            this.splash.add(this.download_splash);

            console.debug(`done downloading ${this.url}`)

            // Handle undefined process function.
            let items = dl;
            if (this.process)
                items = await this.process(dl);
            this.splash.add(this.process_splash);

            console.assert(items);
            console.assert(items.length > 0);
            console.debug(`adding ${items.length} items to ${this.table_name}.`)
            this.table.bulkPut(items).then(() => {
                this.splash.add(this.store_splash);
                console.log(`done adding items to ${this.table_name}.`);
            }).catch(Dexie.BulkError, function (e) {
                console.error(`error: ${e}`);
            });
        }

    }

    get(key) {
        console.assert(this.table);
        return this.table.get(key);
    }
};
