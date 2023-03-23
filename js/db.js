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
}



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

        this.make_tables();

        if (!await this.is_complete()) {

            console.log("downloading and caching the data...");

            let promises = [];

            // Colormaps.
            promises.push(this.add_colormaps(1));

            // Regions.
            let pregions = this.download_regions(2);
            pregions.then((regions) => {
                promises.push(this.add_regions(regions, 3));
            });
            promises.push(pregions);

            // Features.
            let pfeatures = this.download_features('ephys', 3);
            pfeatures.then((features) => {
                promises.push(this.add_features('ephys', features, 1));
            });
            promises.push(pfeatures);

            // SVG slices.
            let slices = await this.download_slices(20);
            // NOTE: wait for the big download to finish here.
            // Once it's finished, we add the slice loading promises to the list.
            promises.push(this.add_slices(slices, 'coronal', 20));
            promises.push(this.add_slices(slices, 'horizontal', 20));
            promises.push(this.add_slices(slices, 'sagittal', 20));
            promises.push(this.add_slices(slices, 'top', 5));
            promises.push(this.add_slices(slices, 'swanson', 5));

            await Promise.all(promises);
            console.log("all done!");
        }

        this.splash.end();
    }

    /* Colormaps                                                                                 */
    /*********************************************************************************************/

    async add_colormaps(progress) {
        let colormaps = await downloadColormaps();
        let items = [];
        for (let cmap in colormaps) {
            items.push({ "name": cmap, "colors": colormaps[cmap] });
        }
        await this.colormaps.bulkPut(items);
        this.splash.add(progress);
    }

    /* Regions                                                                                   */
    /*********************************************************************************************/

    async download_regions(progress) {
        let regions = await downloadRegions();
        console.debug('done downloading regions');
        this.splash.add(progress);
        return regions;
    }

    async add_regions(regions, progress) {
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

    async download_features(fset, progress) {
        let features = await downloadFeatures(fset);
        console.debug('done downloading features');
        this.splash.add(progress);
        return features;
    }

    async add_features(fset, features, progress) {
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

    async download_slices(progress) {
        let slices = await downloadSlices();
        console.debug('done downloading slices');
        this.splash.add(progress);
        return slices;
    }

    async add_slices(slices, axis, progress) {
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

    make_tables() {
        for (let name in DB_TABLES) {
            this[name] = this.db.table(name);
        }
    }

    async is_complete() {
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

    async getColormap(colormap) {
        return await this['colormaps'].get(colormap);
    }
}
