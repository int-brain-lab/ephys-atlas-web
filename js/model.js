export { Model, URLS };

import { BASE_URL } from "./constants.js";
import { Loader } from "./loader.js";
import { Cache } from "./cache.js";
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



/*************************************************************************************************/
/* NPY loading                                                                                   */
/*************************************************************************************************/

function asciiDecode(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function readUint16LE(buffer) {
    var view = new DataView(buffer.buffer);
    var val = view.getUint8(0);
    val |= view.getUint8(1) << 8;
    return val;
}

function utf32ToUnicodeArray(uint8Array, stringLength) {
    const strings = [];
    const totalBytes = uint8Array.length;
    const bytesPerString = stringLength * 4; // Each Unicode character is represented by 4 bytes in UTF-32

    for (let i = 0; i < totalBytes; i += bytesPerString) {
        let stringBytes = uint8Array.slice(i, i + bytesPerString);

        // Convert UTF-32 bytes to Unicode string (little-endian)
        let unicodeString = '';
        for (let j = 0; j < stringBytes.length; j += 4) {
            let codePoint = (stringBytes[j + 3] << 24) | (stringBytes[j + 2] << 16) | (stringBytes[j + 1] << 8) | stringBytes[j];
            if (codePoint == 0) break;
            unicodeString += String.fromCodePoint(codePoint);
        }

        strings.push(unicodeString);
    }

    return strings;
}

function loadNPY(buf) {
    // Check the magic number
    let magic = asciiDecode(buf.slice(0, 6));
    if (magic.slice(1, 6) != 'NUMPY') {
        throw new Error('unknown file type');
    }

    let version = new Uint8Array(buf.slice(6, 8)),
        headerLength = readUint16LE(buf.slice(8, 10)),
        headerStr = asciiDecode(buf.slice(10, 10 + headerLength));
    let offsetBytes = 10 + headerLength;
    //rest = buf.slice(10+headerLength);  XXX -- This makes a copy!!! https://www.khronos.org/registry/typedarray/specs/latest/#5

    // Hacky conversion of dict literal string to JS Object
    // eval("var info = " + headerStr.toLowerCase().replace('(', '[').replace('),', ']'));
    let info = JSON.parse(headerStr.toLowerCase().replace('(', '[').replace(/\,*\)\,*/g, ']').replace(/'/g, "\""));
    // console.log("npy", headerLength, headerStr, info);

    // Intepret the bytes according to the specified dtype
    let data;
    if (info.descr === "|u1") {
        data = new Uint8Array(buf.buffer, offsetBytes);
    } else if (info.descr === "|i1") {
        data = new Int8Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<u2") {
        data = new Uint16Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<i2") {
        data = new Int16Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<u4") {
        data = new Uint32Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<i4") {
        data = new Int32Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<f4") {
        data = new Float32Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<f8") {
        data = new Float64Array(buf.buffer, offsetBytes);
    } else if (info.descr.startsWith("<u")) {
        // String type.
        data = new Uint8Array(buf.buffer, offsetBytes);
        // window.data = data; // DEBUG
        let stringLength = parseInt(info.descr.substring(2));
        data = utf32ToUnicodeArray(data, stringLength);
        // console.log(data);
    } else {
        throw new Error('unknown numeric dtype')
    }

    // NOTE: extract the last 8 bytes which contain extra metadata information, the min and max
    // values of the original value before downsampling to uint8, as two float32 values.
    const startIndex = buf.length - 8;
    let bounds = new Float32Array(buf.buffer, startIndex); // min, max value of the original array

    return {
        shape: info.shape,
        fortran_order: info.fortran_order,
        data: data,
        bounds: bounds,
    };
}

function loadCompressedBase64(base64) {
    const gzippedData = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const inflatedData = pako.inflate(gzippedData);
    const npydata = new Uint8Array(inflatedData);
    return loadNPY(npydata);
}



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
        this.prefetchGeneration = 0;
        this.prefetchQueue = [];
        this.prefetchRunning = false;
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
            return downloadJSON(URLS['bucket'](bucket), refresh);
        });

        // Features.
        this.features = new Cache(async (bucket, fname, options) => {
            const refresh = options ? options.refresh : false;
            const isPrefetch = options ? options.prefetch === true : false;
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
                f = await downloadJSON(url, refresh);
            }

            if (!isPrefetch) {
                this.splash.add(1);
            }

            let out = null;

            if (f) {
                out = f["feature_data"];

                // Special handling of volumes.
                if ("volumes" in f["feature_data"]) {

                    // Load the base64 string into a decompressed array buffer.
                    for (const name in f.feature_data.volumes) {
                        const vol = f.feature_data.volumes[name].volume;
                        f.feature_data.volumes[name].volume = loadCompressedBase64(vol);
                    }

                    // Load optional data:
                    // - xyz positions of the dots
                    if ("xyz" in f["feature_data"])
                        f["feature_data"]["xyz"] = loadCompressedBase64(f["feature_data"]["xyz"]);

                    // - scalar values associated with the dots
                    if ("values" in f["feature_data"])
                        f["feature_data"]["values"] = loadCompressedBase64(f["feature_data"]["values"]);

                    // - image URLs associated to each dot
                    if ("urls" in f["feature_data"])
                        f["feature_data"]["urls"] = loadCompressedBase64(f["feature_data"]["urls"]);

                    if (!isPrefetch) {
                        this.splash.add(1);
                    }
                }

                // HACK: remove void/root
                else {
                    for (const mappingKey in out) {
                        const mapping = out[mappingKey];
                        if (mapping && typeof mapping === 'object') {
                            ['beryl', 'cosmos'].forEach(key => {
                                if (mapping[key] &&
                                    typeof mapping[key] === 'object' &&
                                    mapping[key].data) {
                                    delete mapping[key].data["0"];
                                    delete mapping[key].data["1"];
                                }
                            });
                        }
                    }
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

                try {
                    await this.downloadFeatures(task.bucket, task.fname, { prefetch: true });
                }
                catch (error) {
                    console.warn(`prefetch failed for ${task.bucket}/${task.fname}`, error);
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
        console.log(`download bucket ${bucket}`);
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

    downloadFeatures(bucket, fname, options) {
        console.assert(bucket);
        console.assert(fname);

        console.log(`download features ${fname}`);
        return this.features.download(bucket, fname, options);
    }

    clearFeaturePrefetch() {
        this.prefetchGeneration += 1;
        this.prefetchQueue = [];
    }

    scheduleFeaturePrefetch(bucket, fname) {
        if (!bucket || !fname || bucket == "local") {
            this.clearFeaturePrefetch();
            return;
        }

        const candidates = this._buildPrefetchList(bucket, fname)
            .filter((candidate) => candidate && candidate !== fname && !this.hasFeatures(bucket, candidate));

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
