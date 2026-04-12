export { State, DEFAULT_BUCKET, DEFAULT_BUCKETS };

import { DEBUG, SLICE_DEFAULT } from "./constants.js";
import { parseUrlState, serializeStateToUrl } from "./core/state-url.js";
/** @import { AppStateShape } from "./core/types.js" */



/*************************************************************************************************/
/* Default state                                                                                 */
/*************************************************************************************************/

const DEFAULT_COLORMAP = "magma";
const DEFAULT_COLORMAP_MIN = 0;
const DEFAULT_COLORMAP_MAX = 100;
const DEFAULT_LOG_SCALE = false;

const DEFAULT_BUCKET = "ephys";
const DEFAULT_BUCKETS = ["ephys", "bwm", "local"];
const DEFAULT_STAT = "mean";
const DEFAULT_EXPLODED = 0;

const DEFAULT_MAPPING = "allen";
const DEFAULT_SEARCH = "";
const DEFAULT_HIGHLIGHTED = null;

// Stimulus YlGn
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiWWxHbiIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6InN0aW11bHVzX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInBhbmVsT3BlbiI6ZmFsc2UsInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0

// Choice YlOrRd
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiWWxPclJkIiwiY21hcG1pbiI6MCwiY21hcG1heCI6MTAwLCJsb2dTY2FsZSI6ZmFsc2UsImZuYW1lIjoiY2hvaWNlX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInBhbmVsT3BlbiI6ZmFsc2UsInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0

// Feedback Reds
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiUmVkcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6ImZlZWRiYWNrX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInBhbmVsT3BlbiI6ZmFsc2UsInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0

// Block Purples (Not updated no longer used)
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiUHVycGxlcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6ImJsb2NrX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzEzNDZdLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9

// Wheel Blues
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiJ3aGVlbF9zcGVlZF9kZWNvZGluZ19lZmZlY3QiLCJpc1ZvbHVtZSI6ZmFsc2UsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOltdLCJwYW5lbE9wZW4iOmZhbHNlLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9

// Velocity Blues
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiJ3aGVlbF92ZWxvY2l0eV9kZWNvZGluZ19lZmZlY3QiLCJpc1ZvbHVtZSI6ZmFsc2UsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOltdLCJwYW5lbE9wZW4iOmZhbHNlLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9

// BWM
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoibWFnbWEiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiIiLCJpc1ZvbHVtZSI6bnVsbCwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJhbGxlbiIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInRvcCI6MCwic3dhbnNvbiI6MH0

const ALIAS_STATES = {
    "bwm_choice": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiWWxPclJkIiwiY21hcG1pbiI6MCwiY21hcG1heCI6MTAwLCJsb2dTY2FsZSI6ZmFsc2UsImZuYW1lIjoiY2hvaWNlX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInBhbmVsT3BlbiI6ZmFsc2UsInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0"
    },
    //    "bwm_block": {
    //        "bucket": "bwm",
    //        "state": "eyJjbWFwIjoiUHVycGxlcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6ImJsb2NrX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzEzNDZdLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9"
    //    },
    "bwm_feedback": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiUmVkcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6ImZlZWRiYWNrX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInBhbmVsT3BlbiI6ZmFsc2UsInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0"
    },
    "bwm_stimulus": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiWWxHbiIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6InN0aW11bHVzX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInBhbmVsT3BlbiI6ZmFsc2UsInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0"
    },
    "bwm": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoibWFnbWEiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiIiLCJpc1ZvbHVtZSI6bnVsbCwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJhbGxlbiIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInRvcCI6MCwic3dhbnNvbiI6MH0"
    },
    "bwm_wheel_speed": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiJ3aGVlbF9zcGVlZF9kZWNvZGluZ19lZmZlY3QiLCJpc1ZvbHVtZSI6ZmFsc2UsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOltdLCJwYW5lbE9wZW4iOmZhbHNlLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9"
    },
    "bwm_wheel_velocity": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiJ3aGVlbF92ZWxvY2l0eV9kZWNvZGluZ19lZmZlY3QiLCJpc1ZvbHVtZSI6ZmFsc2UsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOltdLCJwYW5lbE9wZW4iOmZhbHNlLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9"
    },
};

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
