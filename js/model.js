export { Model, URLS };

import { BASE_URL } from "./constants.js";
import { DataClient } from "./data-client.js";
import { FeatureStore } from "./feature-store.js";
import { Loader } from "./loader.js";
import { PrefetchController } from "./prefetch-controller.js";
import { memoize } from "./utils.js";
import { buildRegionColors } from "./core/color-helpers.js";
import { getOrderedBucketFeatures, getVolumeFeatureSet } from "./feature-catalog.js";


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

class Model {
    constructor(splash) {
        this.splash = splash;
        this.dataClient = new DataClient({ urls: URLS });
        this.featureStore = new FeatureStore({ splash, dataClient: this.dataClient });
        this.prefetchController = new PrefetchController({
            delayMs: 150,
            hasFeature: (bucket, fname) => this.hasFeatures(bucket, fname),
            downloadFeature: (bucket, fname, options) => this.downloadFeatures(bucket, fname, options),
        });
        this.volumePrefetchController = new PrefetchController({
            delayMs: 150,
            hasFeature: (bucket, fname) => this.hasFeatures(bucket, fname) || this.hasRawVolumeResponse(bucket, fname),
            downloadFeature: (bucket, fname, options) => this.prefetchRawVolumeResponse(bucket, fname, options),
        });

        this.loaders = {
            'colormaps': this.setupColormaps([1, 1, 1]),
            'regions': this.setupRegions([2, 3, 1]),

            'slices_sagittal': this.setupSlices('sagittal', [10, 0, 5]),
            'slices_coronal': this.setupSlices('coronal', [10, 0, 5]),
            'slices_horizontal': this.setupSlices('horizontal', [10, 0, 5]),
            'slices_top': this.setupSlices('top', [2, 0, 2]),
            'slices_swanson': this.setupSlices('swanson', [2, 0, 2]),
        };

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

    _buildPrefetchList(bucket, fname) {
        const orderedFeatures = this.getOrderedBucketFeatures(bucket);
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
        return this.featureStore.downloadBucket(bucket, options);
    }

    hasBucket(bucket) {
        console.assert(bucket);
        return this.featureStore.hasBucket(bucket);
    }

    getBucket(bucket) {
        console.assert(bucket);
        return this.featureStore.getBucket(bucket);
    }

    async closePersistentCache() {
        return this.featureStore.persistentCache.close();
    }

    async deleteLocalFeature(fname) {
        return this.featureStore.deleteLocalFeature(fname);
    }

    getOrderedBucketFeatures(bucket) {
        if (!bucket || !this.hasBucket(bucket)) {
            return [];
        }

        return getOrderedBucketFeatures(this.getBucket(bucket));
    }

    getVolumeFeatureSet(bucket) {
        if (!bucket || !this.hasBucket(bucket)) {
            return new Set();
        }

        return getVolumeFeatureSet(this.getBucket(bucket));
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

        return this.featureStore.downloadFeature(bucket, fname, options);
    }

    clearFeaturePrefetch() {
        this.prefetchController.clear();
        this.volumePrefetchController.clear();
    }

    scheduleFeaturePrefetch(bucket, fname) {
        if (!bucket || !fname || bucket == "local") {
            this.clearFeaturePrefetch();
            return;
        }

        const volumeFeatures = this.getVolumeFeatureSet(bucket);
        const selectedIsVolume = volumeFeatures.has(fname);
        const rawVolumeTasks = this.getOrderedBucketFeatures(bucket)
            .filter((candidate) =>
                candidate &&
                candidate !== fname &&
                volumeFeatures.has(candidate) &&
                !this.hasFeatures(bucket, candidate) &&
                !this.hasRawVolumeResponse(bucket, candidate))
            .map((candidate) => ({
                bucket,
                fname: candidate,
            }));
        const candidates = this._buildPrefetchList(bucket, fname)
            .filter((candidate) => {
                if (!candidate || candidate === fname || this.hasFeatures(bucket, candidate)) {
                    return false;
                }

                const candidateIsVolume = volumeFeatures.has(candidate);
                if (selectedIsVolume) {
                    return candidateIsVolume;
                }

                return !candidateIsVolume;
            });

        const limitedCandidates = selectedIsVolume ? candidates.slice(0, 2) : candidates;

        const tasks = limitedCandidates.map((candidate) => ({
            bucket,
            fname: candidate,
        }));

        if (rawVolumeTasks.length > 0) {
            this.volumePrefetchController.schedule(rawVolumeTasks);
        }

        if (tasks.length > 0) {
            this.prefetchController.schedule(tasks);
        }
    }

    hasFeatures(bucket, fname) {
        console.assert(bucket);
        console.assert(fname);

        return this.featureStore.hasFeature(bucket, fname);
    }

    hasRawVolumeResponse(bucket, fname) {
        console.assert(bucket);
        console.assert(fname);

        return this.featureStore.hasRawVolumeResponse(bucket, fname);
    }

    prefetchRawVolumeResponse(bucket, fname, options) {
        console.assert(bucket);
        console.assert(fname);

        return this.featureStore.prefetchRawVolumeResponse(bucket, fname, options);
    }

    getFeaturePayload(bucket, fname) {
        console.assert(bucket);

        if (!fname) {
            return null;
        }

        return this.featureStore.getFeature(bucket, fname);
    }

    getFeaturesMappings(bucket, fname) {
        // Return the non-empty mappings of a feature.
        if (!fname)
            return null;
        let g = this.getFeaturePayload(bucket, fname);
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
        let g = this.getFeaturePayload(bucket, fname);
        if (!g) return null;
        if (!g["cmap"]) return null;
        return g["cmap"];
    }

    getFeatures(bucket, fname, mapping) {
        console.assert(bucket);

        if (!fname) {
            return null;
        }
        let g = this.getFeaturePayload(bucket, fname);
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
        let g = this.getFeaturePayload(bucket, fname);
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
        let g = this.getFeaturePayload(bucket, fname);
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
        let featurePayload = this.getFeaturePayload(state.bucket, state.fname);
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
