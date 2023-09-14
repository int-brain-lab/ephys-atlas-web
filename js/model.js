export { Model, URLS };

import { Loader } from "./splash.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

// const BASE_URL = 'https://localhost:5000';
const BASE_URL = 'https://features.internationalbrainlab.org';
const URLS = {
    'colormaps': '/data/json/colormaps.json',
    'regions': '/data/json/regions.json',
    'slices': (name) => `/data/json/slices_${name}.json`,
    'bucket': (bucket) => `${BASE_URL}/api/buckets/${bucket}`,
    'features': (bucket, fname) => `${BASE_URL}/api/buckets/${bucket}/${fname}`,
}



/*************************************************************************************************/
/* Model class                                                                                      */
/*************************************************************************************************/

class Model {
    constructor(splash) {
        this.splash = splash;
        // this.model = this.initDatabase();
        this.model = null;

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
        for (let relidx in regions) {
            let region = regions[relidx];
            let regionIdx = region['idx'];
            kept[regionIdx] = region;
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

    setupBucket(bucket, progress) {
        return new Loader(this.splash, URLS['bucket'](bucket), null, progress);
    }

    async getBucket(bucket, refresh = false) {
        console.assert(bucket);

        if (!(bucket in this.loaders)) {
            let url = URLS['bucket'](bucket);
            console.log(`creating bucket loader for ${url}`);
            this.loaders[bucket] = new Loader(this.splash, url, null, [0, 0, 0]);
        }
        await this.loaders[bucket].start(refresh);
        // if (refresh) {
        //     console.log("refreshing bucket");
        //     await this.loaders[bucket].start(refresh);
        // }
        let loader = this.loaders[bucket];

        console.assert(loader);
        let data = loader.items;
        console.assert(data);
        return data;
    }

    /* Features                                                                                  */
    /*********************************************************************************************/

    async getFeatures(bucket, mapping, fname, refresh = false) {
        // NOTE: this is async because this dynamically creates a new loader and therefore
        // make a HTTP request on demand to get the requested feature.
        console.assert(bucket);
        console.assert(mapping);
        if (!fname) return;
        console.assert(fname);
        console.debug(`getting features ${fname}`);

        let key = [bucket, fname];
        if (!(key in this.loaders)) {
            let url = URLS['features'](bucket, fname);
            console.log(`downloading features for ${bucket}, ${fname}`);

            this.loaders[key] = new Loader(this.splash, url, null, [0, 0, 0]);
        }
        await this.loaders[key].start(refresh);
        // if (refresh) {
        //     console.log("refreshing features");
        //     await this.loaders[key].start(refresh);
        // }
        let loader = this.loaders[key];
        console.assert(loader);

        let g = loader.get("feature_data");
        if (g) {
            let data = g["mappings"][mapping];
            if (!data) {
                console.error(`missing data for mapping ${mapping}`);
            }
            return data;
        }
        return null;
    }

    /* Logic functions                                                                           */
    /*********************************************************************************************/

    // normalize(values, vmin, vmax) {
    //     return values.map(value => normalizeValue(value, vmin, vmax));
    // }
}
