export { FeatureStore };

import { Cache } from "./cache.js";
import { decodeFeaturePayload, decodeFeatureResponseText } from "./feature-decoder.js";
import { PersistentCache } from "./persistent-cache.js";

const PERSISTENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PERSISTENT_CACHE_SCHEMA_VERSION = 1;

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
        const fileName = request.url.split('/').pop();
        const name = fileName.replace(/\.json$/, '');

        if (fileName.endsWith('.json')) {
            dictionary.features[name] = {
                "short_desc": ""
            };
        }
    }

    return dictionary;
}

class FeatureStore {
    constructor({ splash, dataClient }) {
        this.splash = splash;
        this.dataClient = dataClient;
        this.persistentCache = new PersistentCache();
        this.localCache = null;
        this.localCachePromise = caches.open('localCache').then((cache) => {
            this.localCache = cache;
            return cache;
        });

        this.buckets = new Cache(async (bucket, options) => this._loadBucket(bucket, options));
        this.features = new Cache(async (bucket, fname, options) => this._loadFeature(bucket, fname, options));
    }

    async _getLocalCache() {
        if (this.localCache) {
            return this.localCache;
        }
        return this.localCachePromise;
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

    async _loadBucket(bucket, options) {
        if (bucket == "local") {
            const localCache = await this._getLocalCache();
            return loadCacheFiles(localCache);
        }

        const refresh = options ? options.refresh : false;
        const cacheKey = this._getPersistentBucketKey(bucket);
        const cached = refresh ? null : await this._getPersistentCacheEntry(cacheKey);
        if (cached) {
            return cached;
        }

        const data = await this.dataClient.fetchBucket(bucket, { refresh });
        if (data) {
            await this._setPersistentCacheEntry(cacheKey, data);
        }
        return data;
    }

    async _loadFeature(bucket, fname, options) {
        const refresh = options ? options.refresh : false;
        const isPrefetch = options ? options.prefetch === true : false;
        const signal = options ? options.signal : undefined;
        if (!fname) return null;

        if (!isPrefetch) {
            this.splash.setTotal(2);
            this.splash.setDescription(`Downloading feature "${fname}"`);
            this.splash.start();
        }

        let response = null;
        let featureText = null;
        let usedRawVolumeText = false;

        if (bucket == "local") {
            const localCache = await this._getLocalCache();
            const cachedResponse = await localCache.match(`${fname}.json`);
            if (cachedResponse) {
                response = await cachedResponse.json();
            }
            else {
                console.error('File not found in cache.');
            }
        }
        else {
            const cacheKey = this._getPersistentFeatureKey(bucket, fname);
            const cached = refresh ? null : await this._getPersistentCacheEntry(cacheKey);
            if (cached) {
                response = cached;
            }
            else {
                if (this._isVolumeFeature(bucket, fname)) {
                    featureText = await this.dataClient.fetchFeatureText(bucket, fname, { refresh, signal });
                    usedRawVolumeText = featureText != null;
                }
                else {
                    response = await this.dataClient.fetchFeature(bucket, fname, { refresh, signal });
                    if (response) {
                        await this._setPersistentCacheEntry(cacheKey, response);
                    }
                }
            }
        }

        if (!isPrefetch) {
            this.splash.add(1);
        }

        const featureData = usedRawVolumeText
            ? await decodeFeatureResponseText(featureText)
            : await decodeFeaturePayload(response);
        if (featureData && "volumes" in featureData && !isPrefetch) {
            this.splash.add(1);
        }

        if (!isPrefetch) {
            this.splash.end();
        }

        return featureData;
    }

    downloadBucket(bucket, options) {
        return this.buckets.download(bucket, options);
    }

    hasBucket(bucket) {
        return this.buckets.has(bucket);
    }

    getBucket(bucket) {
        return this.buckets.get(bucket);
    }

    downloadFeature(bucket, fname, options) {
        return this.features.download(bucket, fname, options);
    }

    hasFeature(bucket, fname) {
        return this.features.has(bucket, fname);
    }

    getFeature(bucket, fname) {
        return this.features.get(bucket, fname);
    }

    _isVolumeFeature(bucket, fname) {
        if (!bucket || !fname || !this.hasBucket(bucket)) {
            return false;
        }

        const bucketData = this.getBucket(bucket);
        const volumes = bucketData?.metadata?.volumes || [];
        return volumes.includes(fname);
    }

    async deleteLocalFeature(fname) {
        const localCache = await this._getLocalCache();
        await localCache.delete(`${fname}.json`);
    }
}
