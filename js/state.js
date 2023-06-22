export { State, DEFAULT_BUCKET, DEFAULT_BUCKETS };

import { SLICE_MAX, SLICE_DEFAULT } from "./constants.js";
import { encode, decode } from "./utils.js";



/*************************************************************************************************/
/* Default state                                                                                 */
/*************************************************************************************************/

const DEFAULT_COLORMAP = "magma";
const DEFAULT_COLORMAP_MIN = 0;
const DEFAULT_COLORMAP_MAX = 100;

const DEFAULT_BUCKET = "ephys";
const DEFAULT_BUCKETS = ["ephys", "bwm"];
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

    // Determine the list of buckets to show in the buckets dropdown.
    // NOTE: make a copy to avoid modifying the default buckets.
    let buckets = new Array(...DEFAULT_BUCKETS);

    // Alias states.
    if (query.alias) {
        state = decode(ALIAS_STATES[query.alias]);
        // NOTE: we could later decide to add some buckets as a function of the alias.
    }
    else if (query.state) {
        state = decode(query.state);
    }

    // Add buckets passed in the query string.
    if (query.buckets) {
        let newBuckets = query.buckets.split(",");
        buckets.push(...newBuckets);
    }

    // Remove duplicate buckets.
    state.buckets = buckets.filter((value, index, self) => {
        return self.indexOf(value) === index;
    });

    console.log(`buckets are: `, state.buckets.join(','));

    // Take the bucket from the URL query string.
    state.bucket = state.bucket || query.bucket;

    // If the state's bucket does not belong to the buckets, clear the bucket and fname.
    if (!DEFAULT_BUCKETS.includes(state.bucket) && !state.buckets.includes(state.bucket)) {
        state.bucket = null;
        state.fname = null;
    }

    return state;
}


function state2url(state_) {
    // Perform a copy of the state.
    let state = { ...state_ };

    // Extract the list of buckets from the state and put them separately in the URL.
    let buckets = state.buckets || DEFAULT_BUCKETS;

    // Remove default buckets.
    buckets = buckets.filter(item => !DEFAULT_BUCKETS.includes(item));

    // Remove the buckets from the state before computing its hash.
    delete state.buckets;
    // console.log(`buckets are: `, buckets);

    // Generate the URL.
    let url = new URL(window.location);
    let params = url.searchParams;

    // Remove the alias from the URL.
    params.delete('alias');

    // Add the buckets separately in the URL query string.
    if (buckets.length > 0)
        params.set('buckets', buckets.join(','));
    else
        params.delete('buckets');

    // Remove state.bucket from the encoded state, put it separately.
    params.set('bucket', state.bucket);
    delete state.bucket;

    // Add the state to the query string
    params.set('state', encode(state));

    return url.toString();
}



/*************************************************************************************************/
/* State                                                                                         */
/*************************************************************************************************/

class State {
    constructor() {
        this._toggle = true;
        this.fromURL();
    }

    init(state) {
        // Colormap.
        this.cmap = state.cmap || DEFAULT_COLORMAP;
        this.cmapmin = state.cmapmin || DEFAULT_COLORMAP_MIN;
        this.cmapmax = state.cmapmax || DEFAULT_COLORMAP_MAX;

        // Features.
        this.bucket = state.bucket || DEFAULT_BUCKET;
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

    toggleUpdate(toggle) {
        this._toggle = toggle;
    }

    updateURL() {
        if (!this._toggle) return;

        console.log("update URL with current state");

        // Update the address bar URL.

        // Generate the URL from the state.
        let url = this.toURL();

        // Set the URL in the location bar.
        window.history.replaceState(null, '', url.toString());
    }

    fromURL() {
        let state = url2state();
        this.init(state);
    }

    toURL() {
        // HACK: temporarily replace selected, a Set(), by an array, otherwise the JSON
        // serialization won't work.
        let cpy = { ...this };
        delete cpy._toggle;
        cpy.selected = Array.from(cpy.selected);
        let url = state2url(cpy);
        return url;
    }
};
