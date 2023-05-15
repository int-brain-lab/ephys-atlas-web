export { DB };

import { Loader } from "./splash.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const DB_NAME = "IBLEphysAtlasDatabase";

/*
Changelog of the DB versions
1       initial version
2       2023-04-23          replaced "bwm" fset by "bwm_block", "bwm_choice" etc
3       2023-04-25          added more BWM features
4       2023-05-15          refactor JSON loading, 1 JSON file per slice axis
*/

const DB_VERSION = 4;
const DB_TABLES = {
    "colormaps": "name,colors",
    "regions": "mapping,data",

    "slices_coronal": "idx,svg",
    "slices_horizontal": "idx,svg",
    "slices_sagittal": "idx,svg",
    "slices_top": "idx,svg",
    "slices_swanson": "idx,svg",

    "features_ephys": "fname,data,statistics",
    "features_bwm_block": "fname,data,statistics",
    "features_bwm_choice": "fname,data,statistics",
    "features_bwm_feedback": "fname,data,statistics",
    "features_bwm_stimulus": "fname,data,statistics",
};
const FEATURE_SETS = ["ephys", "bwm_block", "bwm_choice", "bwm_feedback", "bwm_stimulus"];
const URLS = {
    'colormaps': '/data/json/colormaps.json',
    'regions': '/data/json/regions.json',
    'slices': (name) => `/data/json/slices_${name}.json`,
    'features': (name) => `/data/json/features_${name}.json`,
}



/*************************************************************************************************/
/* DB class                                                                                      */
/*************************************************************************************************/

class DB {
    constructor(splash) {
        this.splash = splash;
        // this.db = this.initDatabase();
        this.db = null;

        this.loaders = {
            'colormaps': this.setupColormaps([1, 1, 1]),
            'regions': this.setupRegions([2, 3, 1]),

            'slices_sagittal': this.setupSlices('sagittal', [10, 0, 5]),
            'slices_coronal': this.setupSlices('coronal', [10, 0, 5]),
            'slices_horizontal': this.setupSlices('horizontal', [10, 0, 5]),
            'slices_top': this.setupSlices('top', [2, 0, 2]),
            'slices_swanson': this.setupSlices('swanson', [2, 0, 2]),
        };

        // Features.
        for (let fset of FEATURE_SETS) {
            this.loaders[`features_${fset}`] = this.setupFeatures(fset, [2, 1, 1]);
        }
    }

    /* Internal                                                                                  */
    /*********************************************************************************************/

    // initDatabase() {
    //     console.debug("initialize the database");
    //     let db = new Dexie(DB_NAME);
    //     db.version(DB_VERSION).stores(DB_TABLES).upgrade(tx => {
    //         console.warn("database version has increased, deleting the existing database");
    //         this.deleteDatabase();
    //     });
    //     return db;
    // }

    async load() {
        // Start the loading process of each loader.
        let p = []
        for (let loader in this.loaders) {
            console.debug(`start loader '${loader}'`)
            p.push(this.loaders[loader].start());
        }
        await Promise.all(p);
    }

    // deleteDatabase() {
    //     console.warn("deleting the database");
    //     this.db.close();
    //     Dexie.delete(DB_NAME);
    // }

    /* Colormaps                                                                                 */
    /*********************************************************************************************/

    setupColormaps(progress) {
        return new Loader(
            this.db, this.splash, 'colormaps', 'name',
            URLS['colormaps'], this.colormapsLoaded, progress);
    }

    colormapsLoaded(cmaps) {
        let items = [];
        for (let cmap in cmaps) {
            items.push({ "name": cmap, "colors": cmaps[cmap] });
        }
        return items;
    }

    /* Regions                                                                                   */
    /*********************************************************************************************/

    setupRegions(progress) {
        return new Loader(
            this.db, this.splash, 'regions', 'mapping',
            URLS['regions'], this.regionsLoaded, progress);
    }

    regionsLoaded(regions) {
        let items = [];
        for (let mapping in regions) {
            items.push({
                'mapping': mapping,
                'data': regions[mapping],
            });
        }
        return items;
    }

    /* Slices                                                                                    */
    /*********************************************************************************************/

    setupSlices(name, progress) {
        return new Loader(
            this.db, this.splash, `slices_${name}`, 'idx',
            URLS['slices'](name), this.slicesLoaded, progress);
    }

    slicesLoaded(slices) {
        return Object.values(slices)[0];
    }

    /* Features                                                                                  */
    /*********************************************************************************************/

    setupFeatures(fset, progress) {
        return new Loader(
            this.db, this.splash, `features_${fset}`, 'fname',
            URLS['features'](fset), this.featuresLoaded, progress);
    }

    featuresLoaded(features) {
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
        return items;
    }

    /* Getters                                                                                   */
    /*********************************************************************************************/

    getSlice(axis, idx) {
        console.assert(axis);
        return this.loaders[`slices_${axis}`].get(idx || 0);
    }

    getFeatures(fset, mapping, fname) {
        console.assert(fset);
        console.assert(mapping);
        console.assert(fname);

        return this.loaders[`features_${fset}`].get(`${mapping}_${fname}`);
    }

    getRegions(mapping) {
        console.assert(mapping);
        return this.loaders['regions'].get(mapping);
    }

    getColormap(cmap) {
        console.assert(cmap);
        return this.loaders['colormaps'].get(cmap);
    }
}
