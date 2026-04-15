export { State, DEFAULT_BUCKET, DEFAULT_BUCKETS };

import { DEBUG } from "./constants.js";
import { normalizeAppState } from "./core/state-normalize.js";
import { loadStateFromUrl, replaceBrowserUrl, serializeAppStateToUrl } from "./state-router.js";
import { DEFAULT_BUCKET, DEFAULT_BUCKETS } from "./state-defaults.js";
/** @import { AppStateShape } from "./core/types.js" */



/* Default state constants live in state-defaults.js. */

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
        const url = this.toURL();
        return replaceBrowserUrl(url);
    }

    fromURL() {
        this.init(loadStateFromUrl({ debug: DEBUG }));
    }

    toURL() {
        return serializeAppStateToUrl(this);
    }
};
