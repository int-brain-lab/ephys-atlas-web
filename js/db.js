export { DB };

import { Splash } from "./splash.js";
import { downloadJSON } from "./utils.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const DB_NAME = "IBLEphysAtlasDatabase";
const DB_VERSION = 1;
const DB_TABLES = {
    "colormaps": "name,colors",

    "slices_coronal": "idx,svg",
    "slices_horizontal": "idx,svg",
    "slices_sagittal": "idx,svg",
    "slices_top": "idx,svg",
    "slices_swanson": "idx,svg",

    "regions": "mapping,data",

    "features_ephys": "fname,data,statistics",
    "features_bwm": "fname,data,statistics",
}
const FEATURE_SETS = ["ephys", "bwm"];



/*************************************************************************************************/
/* Downloading                                                                                   */
/*************************************************************************************************/

async function downloadSlices() {
    return downloadJSON(`/data/json/slices.json`);
}

async function downloadFeatures(name) {
    console.assert(name);
    return downloadJSON(`/data/json/features_${name}.json`);
}

async function downloadColormaps() {
    return downloadJSON(`/data/json/colormaps.json`);
}

async function downloadRegions() {
    return downloadJSON(`/data/json/regions.json`);
}


/*************************************************************************************************/
/* DB class                                                                                      */
/*************************************************************************************************/

class DB {
    constructor() {
        this.splash = new Splash();
        this.splash.start();
        this.splash.set(0);

        this.db = new Dexie(DB_NAME);
        this.db.version(DB_VERSION).stores(DB_TABLES);
    }

    async load() {
        await this.db.open();

        console.debug("opening the database");

        this.makeTables();

        if (!await this.isComplete()) {

            console.log("downloading and caching the data...");

            let promises = [];

            // Colormaps.
            promises.push(this.addColormaps(1));

            // Regions.
            let pregions = this.downloadRegions(2);
            pregions.then((regions) => {
                promises.push(this.addRegions(regions, 3));
            });
            promises.push(pregions);

            // Features.
            for (let fset of FEATURE_SETS) {
                let pfeatures = this.downloadFeatures(fset, 1.5);
                pfeatures.then((features) => {
                    promises.push(this.addFeatures(fset, features, 1));
                });
                promises.push(pfeatures);
            }

            // SVG slices.
            let slices = await this.downloadSlices(20);
            // NOTE: wait for the big download to finish here.
            // Once it's finished, we add the slice loading promises to the list.
            promises.push(this.addSlices(slices, 'coronal', 20));
            promises.push(this.addSlices(slices, 'horizontal', 20));
            promises.push(this.addSlices(slices, 'sagittal', 20));
            promises.push(this.addSlices(slices, 'top', 5));
            promises.push(this.addSlices(slices, 'swanson', 5));

            await Promise.all(promises);
            console.log("all done!");
        }

        this.splash.end();
    }

    /* Colormaps                                                                                 */
    /*********************************************************************************************/

    async addColormaps(progress) {
        let cmaps = await downloadColormaps();
        let items = [];
        for (let cmap in cmaps) {
            items.push({ "name": cmap, "colors": cmaps[cmap] });
        }
        await this.colormaps.bulkPut(items);
        this.splash.add(progress);
    }

    /* Regions                                                                                   */
    /*********************************************************************************************/

    async downloadRegions(progress) {
        let regions = await downloadRegions();
        console.debug('done downloading regions');
        this.splash.add(progress);
        return regions;
    }

    async addRegions(regions, progress) {
        let items = [];
        for (let mapping in regions) {
            items.push({
                'mapping': mapping,
                'data': regions[mapping],
            });
        }
        await this[`regions`].bulkPut(items);
        console.debug(`done loading regions`);
        this.splash.add(progress);
    }

    /* Features                                                                                  */
    /*********************************************************************************************/

    async downloadFeatures(fset, progress) {
        let features = await downloadFeatures(fset);
        console.debug('done downloading features');
        this.splash.add(progress);
        return features;
    }

    async addFeatures(fset, features, progress) {
        // features: {mapping: {fname: {data: ..., statistics: ...}}}
        console.assert(features);
        // console.log(features);

        let items = [];

        for (let mapping in features) {
            let fet = features[mapping];
            for (let fname in fet) {
                items.push({
                    'fname': `${mapping}_${fname}`,
                    'data': fet[fname]['data'],
                    'statistics': fet[fname]['statistics'],
                });
            }
        }
        await this[`features_${fset}`].bulkPut(items);
        console.debug(`done loading ${fset} features`);
        this.splash.add(progress);
    }

    /* Slices                                                                                    */
    /*********************************************************************************************/

    async downloadSlices(progress) {
        let slices = await downloadSlices();
        console.debug('done downloading slices');
        this.splash.add(progress);
        return slices;
    }

    async addSlices(slices, axis, progress) {
        let items = slices[axis];
        // HACK: these two particular axes do not have a list of strings as there is only 1 slice
        if (axis == "top" || axis == "swanson") {
            items = [{ "idx": 0, "svg": items }];
        }

        // Put the SVG data in the database.
        await this[`slices_${axis}`].bulkPut(items);
        console.debug(`done loading ${axis} slices`);
        this.splash.add(progress);
    }

    /* Internal                                                                                  */
    /*********************************************************************************************/

    makeTables() {
        for (let name in DB_TABLES) {
            this[name] = this.db.table(name);
        }
    }

    async isComplete() {
        return await this.slices_swanson.count() > 0;
    }

    deleteDatabase() {
        console.warn("deleting the database");
        Dexie.delete(DB_NAME);
    }

    /* Getters                                                                                   */
    /*********************************************************************************************/

    async getSlice(axis, idx) {
        console.assert(axis);
        return this[`slices_${axis}`].get(idx || 0);
    }

    async getFeatures(fset, mapping, fname) {
        console.assert(fset);
        console.assert(mapping);
        console.assert(fname);
        let table = this[`features_${fset}`];
        if (!table) {
            console.error(`feature table for fset ${fset} does not exist`);
            return;
        }
        return table.get(`${mapping}_${fname}`);
    }

    async getRegions(mapping) {
        return await this[`regions`].get(mapping);
    }

    async getColormap(cmap) {
        return await this.colormaps.get(cmap);
    }
}
