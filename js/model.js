export { Model, URLS };

import { BASE_URL } from "./constants.js";
import { DataClient } from "./data-client.js";
import { AtlasStaticStore } from "./atlas-static-store.js";
import { FeatureStore } from "./feature-store.js";
import { PrefetchController } from "./prefetch-controller.js";
import { memoize } from "./utils.js";
import { buildRegionColors } from "./core/color-helpers.js";
import { getOrderedBucketFeatures, getVolumeFeatureSet } from "./feature-catalog.js";
import { getFeatureCmap, getFeatureHistogram, getFeatureMappingData, getFeatureMappings, getFeatureVolumeData } from "./feature-payload.js";
import { buildFeaturePrefetchPlan, buildPrefetchList } from "./feature-prefetch-policy.js";


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

        this.atlasStaticStore = new AtlasStaticStore({ splash, urls: URLS });

        this.getColors = memoize(this._getColors.bind(this));
    }

    /* Internal                                                                                  */
    /*********************************************************************************************/

    async load() {
        await this.atlasStaticStore.load();
    }

    getColormap(cmap) {
        return this.atlasStaticStore.getColormap(cmap);
    }

    getRegions(mapping) {
        return this.atlasStaticStore.getRegions(mapping);
    }

    getSlice(axis, idx) {
        return this.atlasStaticStore.getSlice(axis, idx);
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

        const orderedFeatures = this.getOrderedBucketFeatures(bucket);
        const volumeFeatures = this.getVolumeFeatureSet(bucket);
        const { rawVolumeTasks, tasks } = buildFeaturePrefetchPlan({
            bucket,
            fname,
            orderedFeatures,
            volumeFeatures,
            hasFeature: (candidate) => this.hasFeatures(bucket, candidate),
            hasRawVolumeResponse: (candidate) => this.hasRawVolumeResponse(bucket, candidate),
        });

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

    getFeatureMappings(bucket, fname) {
        return getFeatureMappings(this.getFeaturePayload(bucket, fname));
    }

    getFeatureColormap(bucket, fname) {
        return getFeatureCmap(this.getFeaturePayload(bucket, fname));
    }

    getFeatureMappingData(bucket, fname, mapping) {
        console.assert(bucket);
        console.assert(mapping);

        return getFeatureMappingData(this.getFeaturePayload(bucket, fname), mapping);
    }

    getFeatureHistogram(bucket, fname) {
        console.assert(bucket);
        return getFeatureHistogram(this.getFeaturePayload(bucket, fname));
    }

    getFeatureVolumeData(bucket, fname) {
        console.assert(bucket);
        return getFeatureVolumeData(this.getFeaturePayload(bucket, fname));
    }

    /* Colors                                                                                    */
    /*********************************************************************************************/

    _getColors(state, refresh = false) {

        let colors = this.getColormap(state.cmap);
        let regions = this.getRegions(state.mapping);
        let features = state.isVolume ? null : this.getFeatureMappingData(
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
