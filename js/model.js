export { Model, URLS };

import { Loader } from "./loader.js";
import { Cache } from "./cache.js";
import { downloadJSON } from "./utils.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

// const BASE_URL = 'https://features.internationalbrainlab.org';
const BASE_URL = 'https://localhost:5000';
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

function fromArrayBuffer(buf) {
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

            // 'ephys': this.setupBucket('ephys', [1, 1, 1]),
            // 'bwm': this.setupBucket('bwm', [1, 1, 1]),
        };

        this.buckets = new Cache(async (bucket) => { return downloadJSON(URLS['bucket'](bucket)); });

        // // Cached versions of the methods.
        // this.getBucket = cached(this._getBucket.bind(this));
        // this.getFeatures = cached(this._getFeatures.bind(this));
        // this.getVolume = cached(this._getVolume.bind(this));
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

    downloadBucket(bucket) {
        return this.buckets.download(bucket);
    }

    hasBucket(bucket) {
        return this.buckets.has(bucket);
    }

    getBucket(bucket) {
        return this.buckets.get(bucket);
    }

    // setupBucket(bucket, progress) {
    //     return new Loader(this.splash, URLS['bucket'](bucket), progress);
    // }

    // async getBucket(bucket, refresh = false) {
    //     console.assert(bucket);

    //     if (!(bucket in this.loaders)) {
    //         let url = URLS['bucket'](bucket);
    //         console.log(`creating bucket loader for ${url}`);
    //         this.loaders[bucket] = new Loader(this.splash, url, [0, 0, 0]);
    //     }
    //     let loader = this.loaders[bucket];
    //     console.assert(loader);

    //     await loader.start(refresh);

    //     let data = loader.items;
    //     console.assert(data);
    //     return data;
    // }

    /* Features                                                                                  */
    /*********************************************************************************************/

    async getFeatures(bucket, mapping, fname, refresh = false) {
        // NOTE: this is async because this dynamically creates a new loader and therefore
        // make a HTTP request on demand to get the requested feature.
        console.assert(bucket);
        console.assert(mapping);
        if (!fname) return null;
        console.assert(fname);
        console.debug(`getting features ${fname}`);

        let key = [bucket, fname];
        if (!(key in this.loaders)) {
            let url = URLS['features'](bucket, fname);
            console.log(`downloading features for ${bucket}, ${fname}`);

            this.loaders[key] = new Loader(this.splash, url, [0, 0, 0]);
        }
        await this.loaders[key].start(refresh);
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

    /* Volumes                                                                                   */
    /*********************************************************************************************/

    async getVolume(bucket, fname) {
        let url = URLS['features'](bucket, fname);

        try {
            // Start splash screen.
            this.splash.setTotal(2);
            this.splash.set(0);

            // Fetch the binary file
            const response = await fetch(url);

            // Splash progress.
            this.splash.set(1);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Get the response body as a Uint8Array
            const data = new Uint8Array(await response.arrayBuffer());

            // Gunzip the data using pako
            const gunzippedData = pako.inflate(data, { to: 'Uint8Array' });

            let arr = fromArrayBuffer(gunzippedData);

            // End splash.
            this.splash.set(2);

            return arr;

        } catch (error) {
            console.error('Error:', error);
        }
    }
}
