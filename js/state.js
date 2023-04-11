export { State };

import { SLICE_MAX } from "./constants.js";
import { encode, decode } from "./utils.js";



/*************************************************************************************************/
/* Default state                                                                                 */
/*************************************************************************************************/

const DEFAULT_COLORMAP = "viridis";
const DEFAULT_COLORMAP_MIN = 0;
const DEFAULT_COLORMAP_MAX = 100;

const DEFAULT_FSET = "ephys";
export const DEFAULT_FEATURE = {
    "ephys": "psd_alpha",
    "bwm": "block_decoding",
};
const DEFAULT_STAT = "mean";
const DEFAULT_EXPLODED = 0;

const DEFAULT_MAPPING = "beryl";
const DEFAULT_SEARCH = "";
const DEFAULT_HIGHLIGHTED = null;


function url2state() {
    let query = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
    let state = decode(query.state);
    return state;
}


function state2url(state) {
    let url = new URL(window.location);
    let params = url.searchParams;
    params.set('state', encode(state));
    return url.toString();
}



/*************************************************************************************************/
/* State                                                                                         */
/*************************************************************************************************/

class State {
    constructor() {
        this.fromURL();
    }

    init(state) {
        // Colormap.
        this.cmap = state.cmap || DEFAULT_COLORMAP;
        this.cmapmin = state.cmapmin || DEFAULT_COLORMAP_MIN;
        this.cmapmax = state.cmapmax || DEFAULT_COLORMAP_MAX;

        // Features.
        this.fset = state.fset || DEFAULT_FSET;
        this.fname = state.fname || DEFAULT_FEATURE[this.fset];
        this.stat = state.stat || DEFAULT_STAT;

        // Slices.
        this.coronal = parseInt(state.coronal) || (SLICE_MAX['coronal'] / 2);
        this.sagittal = parseInt(state.sagittal) || (SLICE_MAX['sagittal'] / 2);
        this.horizontal = parseInt(state.horizontal) || (SLICE_MAX['horizontal'] / 2);

        // Unity exploded.
        this.exploded = parseFloat(state.exploded) || DEFAULT_EXPLODED;

        // Regions.
        this.mapping = state.mapping || DEFAULT_MAPPING;
        this.search = state.search || DEFAULT_SEARCH;
        this.highlighted = state.highlighted || DEFAULT_HIGHLIGHTED;
        this.selected = new Set(state.selected || []);
    }

    fromURL() {
        let state = url2state();
        this.init(state);
    }

    toURL() {
        // HACK: temporarily replace selected, a Set(), by an array, otherwise the JSON
        // serialization won't work.
        let cpy = { ...this };
        cpy.selected = Array.from(cpy.selected);
        let url = state2url(cpy);
        return url;
    }

    setFset(fset, fname) {
        console.assert(fset);
        this.fset = fset;
        this.fname = fname || this.fname;
        console.assert(this.fname);
        this.stat = DEFAULT_STAT;
    }
};
