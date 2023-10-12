export { Model, URLS };

import { DEBUG } from "./constants.js";
import { Loader } from "./loader.js";
import { Cache } from "./cache.js";
import { downloadJSON } from "./utils.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const BASE_URL = DEBUG ? 'https://localhost:5000' : 'https://features.internationalbrainlab.org';
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

function getVolume(base64) {
    const gzippedData = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const inflatedData = pako.inflate(gzippedData);
    const uint8Array = new Uint8Array(inflatedData);
    return loadNPY(uint8Array);
}



/*************************************************************************************************/
/* Model class                                                                                      */
/*************************************************************************************************/

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

        // Buckets.
        this.buckets = new Cache(async (bucket, options) => {
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

            let f = await downloadJSON(url, refresh);
            this.splash.add(1);

            let out = null;

            if (f) {
                out = f["feature_data"];

                // Special handling of volumes.
                if ("volume" in f["feature_data"]) {
                    // Load the base64 string into a decompressed array buffer.
                    f["feature_data"]["volume"] = getVolume(f["feature_data"]["volume"]);
                    this.splash.add(1);
                }
            }

            this.splash.end();
            return out;
        });
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
}
