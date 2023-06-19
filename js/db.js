export { DB };

import { Loader } from "./splash.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

// const DB_NAME = "IBLEphysAtlasDatabase";

/*
Changelog of the DB versions
1       initial version
2       2023-04-23          replaced "bwm" fset by "bwm_block", "bwm_choice" etc
3       2023-04-25          added more BWM features
4       2023-05-15          refactor JSON loading, 1 JSON file per slice axis
4       2023-06-14          new flask-based server architecture supporting custom feature
*/

// const DB_VERSION = 4;
// const DB_TABLES = {
//     "colormaps": "name,colors",
//     "regions": "mapping,data",

//     "slices_coronal": "idx,svg",
//     "slices_horizontal": "idx,svg",
//     "slices_sagittal": "idx,svg",
//     "slices_top": "idx,svg",
//     "slices_swanson": "idx,svg",

//     "features_ephys": "fname,data,statistics",
//     "features_bwm_block": "fname,data,statistics",
//     "features_bwm_choice": "fname,data,statistics",
//     "features_bwm_feedback": "fname,data,statistics",
//     "features_bwm_stimulus": "fname,data,statistics",
// };
// const FEATURE_SETS = ["ephys", "bwm_block", "bwm_choice", "bwm_feedback", "bwm_stimulus"];
const BASE_URL = 'https://localhost:5000';
const URLS = {
    'colormaps': '/data/json/colormaps.json',
    'regions': '/data/json/regions.json',
    'slices': (name) => `/data/json/slices_${name}.json`,
    'bucket': (fset) => `${BASE_URL}/api/buckets/${fset}`,
    'features': (fset, fname) => `${BASE_URL}/api/buckets/${fset}/${fname}`,
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

            'ephys': this.setupBucket('ephys', [1, 1, 1]),
            'bwm': this.setupBucket('bwm', [1, 1, 1]),
        };

        // // Features.
        // for (let fset of FEATURE_SETS) {
        //     this.loaders[`features_${fset}`] = this.setupFeatures(fset, [2, 1, 1]);
        // }
    }

    /* Internal                                                                                  */
    /*********************************************************************************************/

    async load() {
        // Start the loading process of each loader.
        let p = []
        for (let loader in this.loaders) {
            console.debug(`start loader '${loader}'`)
            p.push(this.loaders[loader].start());
        }
        await Promise.all(p);
    }

    /* Colormaps                                                                                 */
    /*********************************************************************************************/

    setupColormaps(progress) {
        return new Loader(this.splash, URLS['colormaps'], null, progress);
    }


    getColormap(cmap) {
        console.assert(cmap);
        let colors = this.loaders['colormaps'].get(cmap);
        console.assert(colors);
        console.assert(colors.length > 0);
        return colors;
    }

    /* Regions                                                                                   */
    /*********************************************************************************************/

    setupRegions(progress) {
        return new Loader(this.splash, URLS['regions'], null, progress);
    }

    getRegions(mapping) {
        console.assert(mapping);
        let regions = this.loaders['regions'].get(mapping);

        // NOTE: remove left hemisphere regions.
        let kept = {};
        for (let idx in regions) {
            let region = regions[idx];
            if (region.atlas_id <= 0)
                kept[idx] = region;
        }
        // regions = Object.values(regions).filter(region => region.atlas_id >= 0);

        console.assert(kept);
        console.assert(Object.keys(kept).length > 0);
        return kept;
    }

    /* Slices                                                                                    */
    /*********************************************************************************************/

    setupSlices(name, progress) {
        return new Loader(this.splash, URLS['slices'](name), null, progress);
    }

    getSlice(axis, idx) {
        console.assert(axis);
        console.assert(this.loaders[`slices_${axis}`]);
        return this.loaders[`slices_${axis}`].get((idx || 0).toString());
    }

    /* Buckets                                                                                   */
    /*********************************************************************************************/

    setupBucket(fset, progress) {
        return new Loader(this.splash, URLS['bucket'](fset), null, progress);
    }

    async getBucketLoader(fset) {
        console.assert(fset);

        if (!(fset in this.loaders)) {
            let url = URLS['bucket'](fset);
            console.log(`creating loader for ${url}`);
            this.loaders[fset] = new Loader(this.splash, url, null, [1, 0, 1]);
            await this.loaders[fset].start();
        }
        let loader = this.loaders[fset];
        return loader;
    }

    async getBucket(fset) {
        console.assert(fset);

        let loader = await this.getBucketLoader(fset);
        console.assert(loader);
        let data = loader.items;
        console.assert(data);
        return data;
    }

    /* Features                                                                                  */
    /*********************************************************************************************/

    async getFeatures(fset, mapping, fname) {
        // NOTE: this is async because this dynamically creates a new loader and therefore
        // make a HTTP request on demand to get the requested feature.
        console.assert(fset);
        console.assert(mapping);
        if (!fname) return;
        console.assert(fname);

        let key = [fset, fname];
        if (!(key in this.loaders)) {
            let url = URLS['features'](fset, fname);
            console.log(`creating loader for ${url}`);

            this.loaders[key] = new Loader(this.splash, url, null, [1, 0, 1]);
        }
        await this.loaders[key].start();
        let loader = this.loaders[key];
        console.assert(loader);

        let data = loader.get("feature_data")["mappings"][mapping];
        console.assert(data);
        return data;
    }

    /* Logic functions                                                                           */
    /*********************************************************************************************/

    // normalize(values, vmin, vmax) {
    //     return values.map(value => normalizeValue(value, vmin, vmax));
    // }
}
