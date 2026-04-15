export { State, DEFAULT_BUCKET, DEFAULT_BUCKETS };

import { DEBUG, SLICE_DEFAULT } from "./constants.js";
import { parseUrlState, serializeStateToUrl } from "./core/state-url.js";
import {
    ALIAS_STATES,
    DEFAULT_BUCKET,
    DEFAULT_BUCKETS,
    DEFAULT_COLORMAP,
    DEFAULT_COLORMAP_MAX,
    DEFAULT_COLORMAP_MIN,
    DEFAULT_EXPLODED,
    DEFAULT_HIGHLIGHTED,
    DEFAULT_LOG_SCALE,
    DEFAULT_MAPPING,
    DEFAULT_SEARCH,
    DEFAULT_STAT,
} from "./state-defaults.js";
/** @import { AppStateShape } from "./core/types.js" */



/* Default state constants live in state-defaults.js. */

function url2state() {
    return parseUrlState(window.location.search, {
        aliasStates: ALIAS_STATES,
        defaultBucket: DEFAULT_BUCKET,
        defaultBuckets: DEFAULT_BUCKETS,
        debug: DEBUG,
    });
}


function state2url(state_) {
    return serializeStateToUrl(state_, {
        currentUrl: window.location.toString(),
        defaultBuckets: DEFAULT_BUCKETS,
    });
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
        this.logScale = state.logScale || DEFAULT_LOG_SCALE;

        // Features.
        this.bucket = state.bucket || DEFAULT_BUCKET;
        this.buckets = state.buckets || DEFAULT_BUCKETS;
        this.fname = state.fname;
        this.isVolume = state.isVolume;
        this.stat = state.stat || DEFAULT_STAT;

        // Slices.
        this.coronal = parseInt(state.coronal) || (SLICE_DEFAULT['coronal']);
        this.sagittal = parseInt(state.sagittal) || (SLICE_DEFAULT['sagittal']);
        this.horizontal = parseInt(state.horizontal) || (SLICE_DEFAULT['horizontal']);

        // Unity exploded.
        this.exploded = parseFloat(state.exploded) || DEFAULT_EXPLODED;

        // Regions.
        this.mapping = state.mapping || DEFAULT_MAPPING;

        // NOTE: remove search from state
        // this.search = state.search || DEFAULT_SEARCH;

        this.highlighted = state.highlighted || DEFAULT_HIGHLIGHTED;
        this.selected = new Set(state.selected || []);

        // Panel.
        this.panelOpen = state.panelOpen;
    }

    reset() {
        this.init({ 'bucket': this.bucket, 'buckets': this.buckets });
    }

    /** @returns {AppStateShape} */
    snapshot() {
        return /** @type {AppStateShape} */ ({ ...this, selected: new Set(this.selected) });
    }

    setBucket(bucket) {
        this.bucket = bucket;
    }

    setBuckets(buckets) {
        this.buckets = buckets;
    }

    addBucket(bucket) {
        if (!this.buckets.includes(bucket)) {
            this.buckets = [...this.buckets, bucket];
        }
    }

    removeBucket(bucket) {
        this.buckets = this.buckets.filter((value) => value !== bucket);
    }

    setFeature(fname, isVolume = this.isVolume) {
        this.fname = fname;
        this.isVolume = isVolume;
    }

    clearFeature() {
        this.fname = '';
        this.isVolume = null;
    }

    setMapping(mapping) {
        this.mapping = mapping;
    }

    setStat(stat) {
        this.stat = stat;
    }

    setCmap(cmap) {
        this.cmap = cmap;
    }

    setCmapRange(cmapmin, cmapmax) {
        this.cmapmin = cmapmin;
        this.cmapmax = cmapmax;
    }

    setLogScale(logScale) {
        this.logScale = logScale;
    }

    setSliceIndex(axis, idx) {
        this[axis] = idx;
    }

    setHighlighted(idx) {
        this.highlighted = idx;
    }

    setPanelOpen(open) {
        this.panelOpen = open;
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

        // if (!DEBUG)
        window.history.replaceState(null, '', url.toString());

        return url;
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
