export { Model, URLS };

import { BASE_URL } from "./constants.js";
import { Loader } from "./loader.js";
import { Cache } from "./cache.js";
import { decodeFeaturePayload } from "./feature-decoder.js";
import { PersistentCache } from "./persistent-cache.js";
import { downloadJSON, memoize } from "./utils.js";
import { buildRegionColors } from "./core/color-helpers.js";


/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const URLS = {
    'colormaps': '/data/json/colormaps.json',
    'regions': '/data/json/regions.json',
    'slices': (name) => `/data/json/slices_${name}.json`,
    'bucket': (bucket) => `${BASE_URL}/api/buckets/${bucket}`,
    'features': (bucket, fname) => `${BASE_URL}/api/buckets/${bucket}/${fname}`,
}

const PERSISTENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PERSISTENT_CACHE_SCHEMA_VERSION = 1;



/*************************************************************************************************/
/* Model class                                                                                      */
/*************************************************************************************************/

async function loadCacheFiles(cache) {
    const requests = await cache.keys();

    const dictionary = {
        "features": {},
        "metadata": {
            "alias": "local",
            "short_desc": "local bucket",
        }
    };

    for (const request of requests) {
        // Extract the filename from the URL
        const fileName = request.url.split('/').pop();
        const name = fileName.replace(/\.json$/, '');

        if (fileName.endsWith('.json')) {
            // const response = await cache.match(request);
            // if (response) {
            //     const jsonContent = await response.json();
            //     if (jsonContent.short_desc) {

            dictionary.features[name] = {
                "short_desc": ""//name //jsonContent.short_desc
            };

            //     }
            // }
        }
    }

    return dictionary;
}

class Model {
    constructor(splash) {
        this.splash = splash;
        this.persistentCache = new PersistentCache();
        this.prefetchGeneration = 0;
        this.prefetchQueue = [];
        this.prefetchRunning = false;
        this.activePrefetchController = null;
        this.activePrefetchKey = null;
        this.prefetchDelayMs = 150;

        this.loaders = {
            'colormaps': this.setupColormaps([1, 1, 1]),
            'regions': this.setupRegions([2, 3, 1]),

            'slices_sagittal': this.setupSlices('sagittal', [10, 0, 5]),
            'slices_coronal': this.setupSlices('coronal', [10, 0, 5]),
            'slices_horizontal': this.setupSlices('horizontal', [10, 0, 5]),
            'slices_top': this.setupSlices('top', [2, 0, 2]),
            'slices_swanson': this.setupSlices('swanson', [2, 0, 2]),
        };

        // Caches.

        // Open the local cache.
        caches.open('localCache').then((c) => {
            this.localCache = c;
        });

        // Buckets.
        this.buckets = new Cache(async (bucket, options) => {

            // NOTE: special handling of local bucket
            if (bucket == "local") {
                return loadCacheFiles(this.localCache);
            }

            const refresh = options ? options.refresh : false;
            const cacheKey = this._getPersistentBucketKey(bucket);
            const cached = refresh ? null : await this._getPersistentCacheEntry(cacheKey);
            if (cached) {
                return cached;
            }

            const data = await downloadJSON(URLS['bucket'](bucket), refresh);
            if (data) {
                await this._setPersistentCacheEntry(cacheKey, data);
            }
            return data;
        });

        // Features.
        this.features = new Cache(async (bucket, fname, options) => {
            const refresh = options ? options.refresh : false;
            const isPrefetch = options ? options.prefetch === true : false;
            const signal = options ? options.signal : undefined;
            if (!fname) return null;
            const url = URLS['features'](bucket, fname);

            if (!isPrefetch) {
                this.splash.setTotal(2);
                this.splash.setDescription(`Downloading feature "${fname}"`);
                this.splash.start();
            }

            let f = null;

            // NOTE: special handling of local features.
            if (bucket == "local") {
                console.log(`looking for ${fname}.json in cache...`);
                const response = await this.localCache.match(`${fname}.json`);
                if (response) {
                    f = await response.json();
                }
                else {
                    console.error('File not found in cache.');
                }
            }
            else {
                const cacheKey = this._getPersistentFeatureKey(bucket, fname);
                const cached = refresh ? null : await this._getPersistentCacheEntry(cacheKey);
                if (cached) {
                    f = cached;
                }
                else {
                    f = await downloadJSON(url, refresh, { signal });
                    if (f) {
                        if ("volumes" in (f.feature_data || {})) {
                            await this.persistentCache.delete(cacheKey);
                        }
                        else {
                            await this._setPersistentCacheEntry(cacheKey, f);
                        }
                    }
                }
            }

            if (!isPrefetch) {
                this.splash.add(1);
            }

            let out = null;

            if (f) {
                out = decodeFeaturePayload(f);

                if (out && "volumes" in out && !isPrefetch) {
                    this.splash.add(1);
                }
            }

            if (!isPrefetch) {
                this.splash.end();
            }
            return out;
        });

        this.getColors = memoize(this._getColors.bind(this));
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

    _getPersistentBucketKey(bucket) {
        return `bucket:${bucket}`;
    }

    _getPersistentFeatureKey(bucket, fname) {
        return `feature:${bucket}:${fname}`;
    }

    _isPersistentCacheEntryFresh(entry) {
        if (!entry) {
            return false;
        }

        if (entry.schemaVersion !== PERSISTENT_CACHE_SCHEMA_VERSION) {
            return false;
        }

        const age = Date.now() - (entry.storedAt || 0);
        return age >= 0 && age <= PERSISTENT_CACHE_TTL_MS;
    }

    async _getPersistentCacheEntry(key) {
        const entry = await this.persistentCache.get(key);
        if (!this._isPersistentCacheEntryFresh(entry)) {
            if (entry) {
                await this.persistentCache.delete(key);
            }
            return null;
        }
        return entry.payload || null;
    }

    async _setPersistentCacheEntry(key, payload) {
        await this.persistentCache.set(key, {
            payload,
            storedAt: Date.now(),
            schemaVersion: PERSISTENT_CACHE_SCHEMA_VERSION,
        });
    }

    _flattenFeatureTree(node) {
        if (!node) return [];

        const entries = [];
        for (const key in node) {
            if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
            const value = node[key];
            if (value && typeof value === 'object') {
                entries.push(...this._flattenFeatureTree(value));
            }
            else if (value) {
                entries.push(value);
            }
        }
        return entries;
    }

    _getOrderedBucketFeatures(bucketName) {
        if (!bucketName || !this.hasBucket(bucketName)) {
            return [];
        }

        const bucket = this.getBucket(bucketName);
        if (!bucket?.features) {
            return [];
        }

        const fromTree = this._flattenFeatureTree(bucket.metadata?.tree);
        if (fromTree.length > 0) {
            return fromTree.filter((fname, index, arr) => fname && arr.indexOf(fname) === index);
        }

        return Object.keys(bucket.features);
    }

    _getVolumeFeatureSet(bucketName) {
        if (!bucketName || !this.hasBucket(bucketName)) {
            return new Set();
        }

        const bucket = this.getBucket(bucketName);
        const volumeFeatures = bucket?.metadata?.volumes || [];
        return new Set(volumeFeatures);
    }

    _buildPrefetchList(bucket, fname) {
        const orderedFeatures = this._getOrderedBucketFeatures(bucket);
        if (!orderedFeatures.length) {
            return [];
        }

        const currentIndex = orderedFeatures.indexOf(fname);
        if (currentIndex < 0) {
            return orderedFeatures.filter((candidate) => candidate !== fname);
        }

        const prefetch = [];
        for (let distance = 1; distance < orderedFeatures.length; distance++) {
            const nextIndex = currentIndex + distance;
            if (nextIndex < orderedFeatures.length) {
                prefetch.push(orderedFeatures[nextIndex]);
            }

            const prevIndex = currentIndex - distance;
            if (prevIndex >= 0) {
                prefetch.push(orderedFeatures[prevIndex]);
            }
        }
        return prefetch;
    }

    _awaitPrefetchTurn() {
        return new Promise((resolve) => {
            const callback = () => {
                window.setTimeout(resolve, this.prefetchDelayMs);
            };

            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(callback, { timeout: 1000 });
                return;
            }

            callback();
        });
    }

    _abortActivePrefetch() {
        if (this.activePrefetchController) {
            this.activePrefetchController.abort();
        }
        this.activePrefetchController = null;
        this.activePrefetchKey = null;
    }

    async _drainPrefetchQueue(generation) {
        if (this.prefetchRunning) return;
        this.prefetchRunning = true;

        try {
            while (generation === this.prefetchGeneration && this.prefetchQueue.length > 0) {
                const task = this.prefetchQueue.shift();
                if (!task) continue;

                if (task.generation !== this.prefetchGeneration) continue;
                if (this.hasFeatures(task.bucket, task.fname)) continue;

                await this._awaitPrefetchTurn();
                if (task.generation !== this.prefetchGeneration) continue;

                const controller = new AbortController();
                this.activePrefetchController = controller;
                this.activePrefetchKey = `${task.bucket}/${task.fname}`;

                try {
                    await this.downloadFeatures(task.bucket, task.fname, {
                        prefetch: true,
                        signal: controller.signal,
                    });
                }
                catch (error) {
                    if (error?.name !== 'AbortError') {
                        console.warn(`prefetch failed for ${task.bucket}/${task.fname}`, error);
                    }
                }
                finally {
                    if (this.activePrefetchController === controller) {
                        this.activePrefetchController = null;
                        this.activePrefetchKey = null;
                    }
                }
            }
        }
        finally {
            this.prefetchRunning = false;

            if (generation === this.prefetchGeneration && this.prefetchQueue.length > 0) {
                this._drainPrefetchQueue(generation);
            }
        }
    }

    /* Colormaps                                                                                 */
    /*********************************************************************************************/

    setupColormaps(progress) {
        return new Loader(this.splash, URLS['colormaps'], progress);
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
        return new Loader(this.splash, URLS['regions'], progress);
    }

    getRegions(mapping) {
        console.assert(mapping);
        let regions = this.loaders['regions'].get(mapping);

        // NOTE: remove left hemisphere regions.
        let kept = {};
        for (let relidx in regions) {
            let region = regions[relidx];
            let regionIdx = region['idx'];
            // NOTE: skip non-leaf Allen regions
            if (mapping == "allen" && !region['leaf']) {
                // console.log(region);
                continue;
            }
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
        return new Loader(this.splash, URLS['slices'](name), progress);
    }

    getSlice(axis, idx) {
        console.assert(axis);
        console.assert(this.loaders[`slices_${axis}`]);
        return this.loaders[`slices_${axis}`].get((idx || 0).toString());
    }

    /* Buckets                                                                                   */
    /*********************************************************************************************/

    downloadBucket(bucket, options) {
        console.assert(bucket);
        return this.buckets.download(bucket, options);
    }

    hasBucket(bucket) {
        console.assert(bucket);
        return this.buckets.has(bucket);
    }

    getBucket(bucket) {
        console.assert(bucket);
        return this.buckets.get(bucket);
    }

    /* Features                                                                                  */
    /*********************************************************************************************/

    getFeatureMetadata(bucket, fname) {
        console.assert(bucket);

        if (!fname) {
            return null;
        }

        const bucketData = this.getBucket(bucket);
        if (!bucketData?.features) {
            return null;
        }

        return bucketData.features[fname] || null;
    }

    getFeatureUnit(bucket, fname) {
        const metadata = this.getFeatureMetadata(bucket, fname);
        return metadata?.unit || null;
    }

    downloadFeatures(bucket, fname, options) {
        console.assert(bucket);
        console.assert(fname);

        return this.features.download(bucket, fname, options);
    }

    clearFeaturePrefetch() {
        this.prefetchGeneration += 1;
        this.prefetchQueue = [];
        this._abortActivePrefetch();
    }

    scheduleFeaturePrefetch(bucket, fname) {
        if (!bucket || !fname || bucket == "local") {
            this.clearFeaturePrefetch();
            return;
        }

        const volumeFeatures = this._getVolumeFeatureSet(bucket);
        if (volumeFeatures.has(fname)) {
            this.clearFeaturePrefetch();
            return;
        }

        const candidates = this._buildPrefetchList(bucket, fname)
            .filter((candidate) =>
                candidate &&
                candidate !== fname &&
                !volumeFeatures.has(candidate) &&
                !this.hasFeatures(bucket, candidate));

        this.prefetchGeneration += 1;
        const generation = this.prefetchGeneration;
        this.prefetchQueue = candidates.map((candidate) => ({
            bucket,
            fname: candidate,
            generation,
        }));

        if (this.prefetchQueue.length === 0) {
            return;
        }

        this._drainPrefetchQueue(generation);
    }

    hasFeatures(bucket, fname) {
        console.assert(bucket);
        console.assert(fname);

        return this.features.has(bucket, fname);
    }

    getFeaturesMappings(bucket, fname) {
        // Return the non-empty mappings of a feature.
        if (!fname)
            return null;
        let g = this.features.get(bucket, fname);
        if (!g) return null;
        if (!g["mappings"]) return null;
        let mappings = [];
        for (let mapping in g["mappings"]) {
            let ids = Object.keys(g["mappings"][mapping]["data"]);
            ids.pop("1");
            if (ids.length > 0) mappings.push(mapping);
        }
        return mappings;
    }

    getCmap(bucket, fname) {
        if (!fname)
            return null;
        let g = this.features.get(bucket, fname);
        if (!g) return null;
        if (!g["cmap"]) return null;
        return g["cmap"];
    }

    getFeatures(bucket, fname, mapping) {
        console.assert(bucket);

        if (!fname) {
            return null;
        }
        let g = this.features.get(bucket, fname);
        if (!g) {
            return null;
        }

        if ("mappings" in g) {
            console.assert(mapping);
            return g["mappings"][mapping];
        }
        return null;
    }

    getHistogram(bucket, fname) {
        console.assert(bucket);

        if (!fname) {
            return null;
        }
        let g = this.features.get(bucket, fname);
        if (!g) {
            return null;
        }

        if ("histogram" in g) {
            return g["histogram"];
        }
        return null;
    }

    getVolumeData(bucket, fname) {
        console.assert(bucket);
        if (!fname) {
            return null;
        }
        let g = this.features.get(bucket, fname);
        if (!g) {
            return null;
        }
        if ("volumes" in g) {
            g["volumes"]["is_volume"] = true;
            return g;
        }
        return null;
    }

    /* Colors                                                                                    */
    /*********************************************************************************************/

    _getColors(state, refresh = false) {

        let colors = this.getColormap(state.cmap);
        let regions = this.getRegions(state.mapping);
        let features = state.isVolume ? null : this.getFeatures(
            state.bucket, state.fname, state.mapping, refresh);
        let featurePayload = this.features.get(state.bucket, state.fname);
        let histogram = featurePayload ? featurePayload['histogram'] : null;

        let regionColors = buildRegionColors({
            regions,
            features,
            stat: state.stat,
            cmin: state.cmapmin,
            cmax: state.cmapmax,
            logScale: state.logScale,
            colors,
            histogram,
        });

        if (!regionColors) {
            console.warn("there is no data! skipping region coloring");
            return;
        }

        return regionColors;
    }

}
