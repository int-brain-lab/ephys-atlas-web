export { State, DEFAULT_BUCKET, DEFAULT_BUCKETS };

import { DEBUG } from "./constants.js";
import { normalizeAppState } from "./core/state-normalize.js";
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
        Object.assign(this, normalizeAppState(state));
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
