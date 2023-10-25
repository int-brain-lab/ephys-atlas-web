export { State, DEFAULT_BUCKET, DEFAULT_BUCKETS };

import { DEBUG, SLICE_DEFAULT } from "./constants.js";
import { encode, decode } from "./utils.js";



/*************************************************************************************************/
/* Default state                                                                                 */
/*************************************************************************************************/

const DEFAULT_COLORMAP = "magma";
const DEFAULT_COLORMAP_MIN = 0;
const DEFAULT_COLORMAP_MAX = 100;
const DEFAULT_LOG_SCALE = false;

const DEFAULT_BUCKET = "ephys";
const DEFAULT_BUCKETS = ["ephys", "bwm"];
const DEFAULT_STAT = "mean";
const DEFAULT_EXPLODED = 0;

const DEFAULT_MAPPING = "beryl";
const DEFAULT_SEARCH = "";
const DEFAULT_HIGHLIGHTED = null;

// Stimulus YlGn
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiWWxHbiIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6InN0aW11bHVzX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzE0OTksMTUyNywyMTU4LDIyNDEsMjMwM10sInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0%3D

// Choice YlOrRd
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiWWxPclJkIiwiY21hcG1pbiI6MCwiY21hcG1heCI6MTAwLCJsb2dTY2FsZSI6ZmFsc2UsImZuYW1lIjoiY2hvaWNlX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsInNlYXJjaCI6IkdSTiIsImhpZ2hsaWdodGVkIjo0OTUsInNlbGVjdGVkIjpbMTk3MywyMTcyLDIyNDEsMjMwM10sInRvcCI6MCwic3dhbnNvbiI6MH0

// Feedback Reds
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiUmVkcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6ImZlZWRiYWNrX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzE0NjQsMjE2NiwyMTk1LDIyNDcsMjI0MV0sInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0%3D

// Block Purples
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiUHVycGxlcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6ImJsb2NrX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzEzNDZdLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9

// Wheel Blues
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiJ3aGVlbF9zcGVlZF9kZWNvZGluZ19lZmZlY3QiLCJpc1ZvbHVtZSI6ZmFsc2UsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOlsxOTc1LDIzMTYsMjMwMywyMzA2LDI0MTJdLCJwYW5lbE9wZW4iOmZhbHNlLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9

// Velocity Blues
// https://atlas.internationalbrainlab.org/?bucket=bwm&state=eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiJ3aGVlbF92ZWxvY2l0eV9kZWNvZGluZ19lZmZlY3QiLCJpc1ZvbHVtZSI6ZmFsc2UsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOlsxOTc1LDIzMTYsMjMwMywyMzA2LDI0MTJdLCJwYW5lbE9wZW4iOmZhbHNlLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9

const ALIAS_STATES = {
    "bwm_choice": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiWWxPclJkIiwiY21hcG1pbiI6MCwiY21hcG1heCI6MTAwLCJsb2dTY2FsZSI6ZmFsc2UsImZuYW1lIjoiY2hvaWNlX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsInNlYXJjaCI6IkdSTiIsImhpZ2hsaWdodGVkIjo0OTUsInNlbGVjdGVkIjpbMTk3MywyMTcyLDIyNDEsMjMwM10sInRvcCI6MCwic3dhbnNvbiI6MH0"
    },
    "bwm_block": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiUHVycGxlcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6ImJsb2NrX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzEzNDZdLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9"
    },
    "bwm_feedback": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiUmVkcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6ImZlZWRiYWNrX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzE0NjQsMjE2NiwyMTk1LDIyNDcsMjI0MV0sInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0%3D"
    },
    "bwm_stimulus": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiWWxHbiIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6InN0aW11bHVzX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzE0OTksMTUyNywyMTU4LDIyNDEsMjMwM10sInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0%3D"
    },
    "bwm": {
        "bucket": "bwm",
        "state": "yJjbWFwIjoibWFnbWEiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiIiLCJzdGF0IjoibWVhbiIsImNvcm9uYWwiOjY2MCwic2FnaXR0YWwiOjU1MCwiaG9yaXpvbnRhbCI6NDAwLCJleHBsb2RlZCI6MCwibWFwcGluZyI6ImJlcnlsIiwiaGlnaGxpZ2h0ZWQiOm51bGwsInNlbGVjdGVkIjpbXSwidG9wIjowLCJzd2Fuc29uIjowLCJzZWFyY2giOiIifQ%3D%3D"
    },
    "bwm_wheel_speed": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiJ3aGVlbF9zcGVlZF9kZWNvZGluZ19lZmZlY3QiLCJpc1ZvbHVtZSI6ZmFsc2UsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOlsxOTc1LDIzMTYsMjMwMywyMzA2LDI0MTJdLCJwYW5lbE9wZW4iOmZhbHNlLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9"
    },
    "bwm_wheel_velocity": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiJ3aGVlbF92ZWxvY2l0eV9kZWNvZGluZ19lZmZlY3QiLCJpc1ZvbHVtZSI6ZmFsc2UsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOlsxOTc1LDIzMTYsMjMwMywyMzA2LDI0MTJdLCJwYW5lbE9wZW4iOmZhbHNlLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9"
    },
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
        const s = ALIAS_STATES[query.alias];
        const decodedState = decode(s.state);
        if (DEBUG)
            console.log("decoded state", decodedState);
        state = decodedState;

        // NOTE: special handling for bucket and buckets, as these are NOT part of the state,
        // in order to keep them human readable in the URL.
        state.bucket = s.bucket || DEFAULT_BUCKET;
        state.buckets = s.buckets || DEFAULT_BUCKETS;
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
        state.isVolume = null;
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
