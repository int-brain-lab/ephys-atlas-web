export { Model, URLS };

import { BASE_URL } from "./constants.js";
import { Loader } from "./loader.js";
import { Cache } from "./cache.js";
import { downloadJSON, memoize, normalizeValue, clamp } from "./utils.js";


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
            if (!fname) return null;
            const url = URLS['features'](bucket, fname);

            this.splash.setTotal(2);
            this.splash.setDescription(`Downloading feature "${fname}"`);
            this.splash.start();

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

            this.splash.add(1);

            let out = null;

            if (f) {
                out = f["feature_data"];

                // Special handling of volumes.
                if ("volume" in f["feature_data"]) {
                    // Load the base64 string into a decompressed array buffer.
                    f["feature_data"]["volume"] = loadCompressedBase64(f["feature_data"]["volume"]);

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

                    this.splash.add(1);
                }
            }

            this.splash.end();
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

    getFeatures(bucket, fname, mapping) {
        console.assert(bucket);

        if (!fname) {
            return null;
        }
        let g = this.features.get(bucket, fname);
        if (!g) {
            return null;
        }

        if ("volume" in g) {
            return g["volume"];
        }
        else if ("mappings" in g) {
            console.assert(mapping);
            return g["mappings"][mapping];
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

        if ("volume" in g) {
            return g;
        }
        return null;
    }

    /* Colors                                                                                    */
    /*********************************************************************************************/

    _getColors(state, refresh = false) {

        // Get the state information.
        let stat = state.stat;
        let cmin = state.cmapmin;
        let cmax = state.cmapmax;

        // Load the colormap.
        let colors = this.getColormap(state.cmap);

        // Load the region and features data.
        let regions = this.getRegions(state.mapping);
        let features = state.isVolume ? null : this.getFeatures(
            state.bucket, state.fname, state.mapping, refresh);

        // Figure out what hemisphere values we have
        let feature_max = features ? Math.max.apply(null, Object.keys(features['data'])) : null;
        let feature_min = features ? Math.min.apply(null, Object.keys(features['data'])) : null;

        // Compute the color as a function of the cmin/cmax slider values.
        let vmin = features ? features['statistics'][stat]['min'] : 0;
        let vmax = features ? features['statistics'][stat]['max'] : 1;

        let idx_lr = 1327; // Below idx_lr: right hemisphere. Above: left hemisphere.
        let hasLeft = true; // whether there is at least a left hemisphere region with a value
        let hasRight = true; // whether there is at least a left hemisphere region with a value

        if (feature_max == null || feature_min == null) {
            console.warn("there is no data! skipping region coloring");
            return;
        }
        console.assert(feature_min >= 0);
        console.assert(feature_max > 0);

        if (feature_max <= idx_lr) {
            hasLeft = false;
        }
        if (feature_min > idx_lr) {
            hasRight = false;
        }
        // Here the hasLeft and hasRight values should be set. At least one of them is true.
        console.assert(hasLeft || hasRight);

        let regionColors = {};

        // Go through all regions.
        for (let regionIdx in regions) {
            let region = regions[regionIdx];
            console.assert(region);

            // Region name and acronym.
            let name = region['name'];
            // let acronym = region['acronym'];

            // Which hemisphere this region is in.
            let isLeft = name.includes('left'); // false => isRight :)

            // True iff there is at least another region in that hemisphere with data.
            let dataInHemisphere = (isLeft && hasLeft) || (!isLeft && hasRight);

            // Retrieve the region value.
            let value = features ? features['data'][regionIdx] : null;

            // Region that does not appear in the features? White if there is data in its
            // hemisphere, default allen color otherwise.
            if (!value) {
                if (dataInHemisphere) {
                    regionColors[regionIdx] = '#ffffff'; // white
                }
                // else, do nothing = default allen color.
                continue;
            }
            value = value[stat];

            // Region that appears in the features but with a null value? Grey.
            if (!value) {
                regionColors[regionIdx] = '#d3d3d3'; // grey
                continue;
            }

            // If we make it till here, it means there is a valid value and we can compute the
            // color with the colormap.

            if (state.logScale) {
                if (vmin <= 0) {
                    console.error("unable to activate the log scale, all values should be >0");
                }
                else {
                    console.assert(vmin > 0);
                    console.assert(vmax > vmin);

                    value = Math.log(value) / LOG_10;
                    vmin = Math.log(vmin) / LOG_10;
                    vmax = Math.log(vmax) / LOG_10;
                }
            }

            let vdiff = vmax - vmin;

            let vminMod = vmin + vdiff * cmin / 100.0;
            let vmaxMod = vmin + vdiff * cmax / 100.0;
            let normalized = normalizeValue(value, vminMod, vmaxMod);
            console.assert(normalized != null && normalized != undefined);

            // Compute the color.
            let hex = colors[clamp(normalized, 0, 99)];

            regionColors[regionIdx] = hex;
        }

        return regionColors;
    }

}
