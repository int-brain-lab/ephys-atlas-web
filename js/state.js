export { State, DEFAULT_BUCKETS };

import { SLICE_MAX, SLICE_DEFAULT } from "./constants.js";
import { encode, decode } from "./utils.js";



/*************************************************************************************************/
/* Default state                                                                                 */
/*************************************************************************************************/

const DEFAULT_COLORMAP = "magma";
const DEFAULT_COLORMAP_MIN = 0;
const DEFAULT_COLORMAP_MAX = 100;

const DEFAULT_FSET = "ephys";
const DEFAULT_BUCKETS = ["ephys", "bwm"];
// export const DEFAULT_FEATURE = {
//     "ephys": "psd_alpha",
//     "bwm_block": "decoding",
//     "bwm_choice": "decoding",
//     "bwm_feedback": "decoding",
//     "bwm_stimulus": "decoding",
// };
const DEFAULT_STAT = "mean";
const DEFAULT_EXPLODED = 0;

const DEFAULT_MAPPING = "beryl";
const DEFAULT_SEARCH = "";
const DEFAULT_HIGHLIGHTED = null;

// Stimulus YlGn
// https://ephysatlas.internationalbrainlab.org/?state=eyJjbWFwIjoiWWxHbiIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9zdGltdWx1cyIsImZuYW1lIjoiZGVjb2RpbmciLCJzdGF0IjoibWVhbiIsImNvcm9uYWwiOjY2MCwic2FnaXR0YWwiOjU1MCwiaG9yaXpvbnRhbCI6NDAwLCJleHBsb2RlZCI6MCwibWFwcGluZyI6ImJlcnlsIiwic2VhcmNoIjoiIiwiaGlnaGxpZ2h0ZWQiOm51bGwsInNlbGVjdGVkIjpbXSwidG9wIjowLCJzd2Fuc29uIjowfQ%3D%3D

// Choice YlOrRd
// https://ephysatlas.internationalbrainlab.org/?state=eyJjbWFwIjoiWWxPclJkIiwiY21hcG1pbiI6MCwiY21hcG1heCI6MTAwLCJmc2V0IjoiYndtX2Nob2ljZSIsImZuYW1lIjoiZGVjb2RpbmciLCJzdGF0IjoibWVhbiIsImNvcm9uYWwiOjY2MCwic2FnaXR0YWwiOjU1MCwiaG9yaXpvbnRhbCI6NDAwLCJleHBsb2RlZCI6MCwibWFwcGluZyI6ImJlcnlsIiwic2VhcmNoIjoiIiwiaGlnaGxpZ2h0ZWQiOm51bGwsInNlbGVjdGVkIjpbXSwidG9wIjowLCJzd2Fuc29uIjowfQ%3D%3D

// Feedback Reds
// https://ephysatlas.internationalbrainlab.org/?state=eyJjbWFwIjoiUmVkcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9mZWVkYmFjayIsImZuYW1lIjoiZGVjb2RpbmciLCJzdGF0IjoibWVhbiIsImNvcm9uYWwiOjY2MCwic2FnaXR0YWwiOjU1MCwiaG9yaXpvbnRhbCI6NDAwLCJleHBsb2RlZCI6MCwibWFwcGluZyI6ImJlcnlsIiwic2VhcmNoIjoiIiwiaGlnaGxpZ2h0ZWQiOm51bGwsInNlbGVjdGVkIjpbXSwidG9wIjowLCJzd2Fuc29uIjowfQ%3D%3D

// Block Purples
// https://ephysatlas.internationalbrainlab.org/?state=eyJjbWFwIjoiUHVycGxlcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9ibG9jayIsImZuYW1lIjoiZGVjb2RpbmciLCJzdGF0IjoibWVhbiIsImNvcm9uYWwiOjY2MCwic2FnaXR0YWwiOjU1MCwiaG9yaXpvbnRhbCI6NDAwLCJleHBsb2RlZCI6MCwibWFwcGluZyI6ImJlcnlsIiwic2VhcmNoIjoiIiwiaGlnaGxpZ2h0ZWQiOm51bGwsInNlbGVjdGVkIjpbXSwidG9wIjowLCJzd2Fuc29uIjowfQ%3D%3D

const ALIAS_STATES = {
    "bwm_choice": "eyJjbWFwIjoiWWxPclJkIiwiY21hcG1pbiI6MCwiY21hcG1heCI6MTAwLCJmc2V0IjoiYndtX2Nob2ljZSIsImZuYW1lIjoiZGVjb2RpbmciLCJzdGF0IjoibWVhbiIsImNvcm9uYWwiOjY2MCwic2FnaXR0YWwiOjU1MCwiaG9yaXpvbnRhbCI6NDAwLCJleHBsb2RlZCI6MCwibWFwcGluZyI6ImJlcnlsIiwic2VhcmNoIjoiIiwiaGlnaGxpZ2h0ZWQiOm51bGwsInNlbGVjdGVkIjpbXSwidG9wIjowLCJzd2Fuc29uIjowfQ",
    "bwm_block":
        "eyJjbWFwIjoiUHVycGxlcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9ibG9jayIsImZuYW1lIjoiZGVjb2RpbmciLCJzdGF0IjoibWVhbiIsImNvcm9uYWwiOjY2MCwic2FnaXR0YWwiOjU1MCwiaG9yaXpvbnRhbCI6NDAwLCJleHBsb2RlZCI6MCwibWFwcGluZyI6ImJlcnlsIiwic2VhcmNoIjoiIiwiaGlnaGxpZ2h0ZWQiOm51bGwsInNlbGVjdGVkIjpbXSwidG9wIjowLCJzd2Fuc29uIjowfQ",
    "bwm_feedback":
        "eyJjbWFwIjoiUmVkcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9mZWVkYmFjayIsImZuYW1lIjoiZGVjb2RpbmciLCJzdGF0IjoibWVhbiIsImNvcm9uYWwiOjY2MCwic2FnaXR0YWwiOjU1MCwiaG9yaXpvbnRhbCI6NDAwLCJleHBsb2RlZCI6MCwibWFwcGluZyI6ImJlcnlsIiwic2VhcmNoIjoiIiwiaGlnaGxpZ2h0ZWQiOm51bGwsInNlbGVjdGVkIjpbXSwidG9wIjowLCJzd2Fuc29uIjowfQ",
    "bwm_stimulus": "eyJjbWFwIjoiWWxHbiIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9zdGltdWx1cyIsImZuYW1lIjoiZGVjb2RpbmciLCJzdGF0IjoibWVhbiIsImNvcm9uYWwiOjY2MCwic2FnaXR0YWwiOjU1MCwiaG9yaXpvbnRhbCI6NDAwLCJleHBsb2RlZCI6MCwibWFwcGluZyI6ImJlcnlsIiwic2VhcmNoIjoiIiwiaGlnaGxpZ2h0ZWQiOm51bGwsInNlbGVjdGVkIjpbXSwidG9wIjowLCJzd2Fuc29uIjowfQ"

};

function url2state() {
    let query = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
    let state = {};

    // Alias states.
    if (query.alias) {
        state = decode(ALIAS_STATES[query.alias]);
    }
    else if (query.state) {
        state = decode(query.state);
    }

    return state;
}


function state2url(state) {
    let url = new URL(window.location);
    let params = url.searchParams;
    params.delete('alias');
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
        this.buckets = state.buckets || DEFAULT_BUCKETS;
        this.fname = state.fname;
        this.stat = state.stat || DEFAULT_STAT;

        // Slices.
        this.coronal = parseInt(state.coronal) || (SLICE_DEFAULT['coronal']);
        this.sagittal = parseInt(state.sagittal) || (SLICE_DEFAULT['sagittal']);
        this.horizontal = parseInt(state.horizontal) || (SLICE_DEFAULT['horizontal']);

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
        // TODO
        // console.assert(fset);
        // this.fset = fset;
        // this.fname = fname || this.fname;
        // console.assert(this.fname);
        // this.stat = DEFAULT_STAT;
    }
};
