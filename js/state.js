export { State };

import { SLICE_MAX, SLICE_DEFAULT } from "./constants.js";
import { encode, decode } from "./utils.js";



/*************************************************************************************************/
/* Default state                                                                                 */
/*************************************************************************************************/

const DEFAULT_COLORMAP = "magma";
const DEFAULT_COLORMAP_MIN = 0;
const DEFAULT_COLORMAP_MAX = 100;

const DEFAULT_FSET = "ephys";
export const DEFAULT_FEATURE = {
    "ephys": "psd_alpha",
    "bwm_block": "euclidean_effect",
    "bwm_choice": "euclidean_effect",
    "bwm_feedback": "euclidean_effect",
    "bwm_stimulus": "euclidean_effect",
    "bwm_wheel_speed": "euclidean_effect",
    "bwm_wheel_velocity": "euclidean_effect",
};
const DEFAULT_STAT = "mean";
const DEFAULT_EXPLODED = 0;

const DEFAULT_MAPPING = "beryl";
const DEFAULT_SEARCH = "";
const DEFAULT_HIGHLIGHTED = null;

// Stimulus YlGn
// https://atlas.internationalbrainlab.org/?state=eyJjbWFwIjoiWWxHbiIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9zdGltdWx1cyIsImZuYW1lIjoiZGVjb2RpbmdfZWZmZWN0Iiwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsInNlYXJjaCI6IiIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzE0OTksMTUyNywyMTU4LDIyNDEsMjMwM10sInRvcCI6MCwic3dhbnNvbiI6MH0

// Choice YlOrRd
// https://atlas.internationalbrainlab.org/?state=eyJjbWFwIjoiWWxPclJkIiwiY21hcG1pbiI6MCwiY21hcG1heCI6MTAwLCJmc2V0IjoiYndtX2Nob2ljZSIsImZuYW1lIjoiZGVjb2RpbmdfZWZmZWN0Iiwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsInNlYXJjaCI6IiIsImhpZ2hsaWdodGVkIjoyMzAzLCJzZWxlY3RlZCI6WzE5NzMsMjE3MiwyMjQxLDIzMDNdLCJ0b3AiOjAsInN3YW5zb24iOjB9

// Feedback Reds
// https://atlas.internationalbrainlab.org/?state=eyJjbWFwIjoiUmVkcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9mZWVkYmFjayIsImZuYW1lIjoiZGVjb2RpbmdfZWZmZWN0Iiwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsInNlYXJjaCI6IiIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzE0NjQsMjE2NiwyMTk1LDIyNDcsMjI0MV0sInRvcCI6MCwic3dhbnNvbiI6MH0

// Block Purples
// https://atlas.internationalbrainlab.org/?state=eyJjbWFwIjoiUHVycGxlcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9ibG9jayIsImZuYW1lIjoiZGVjb2RpbmdfZWZmZWN0Iiwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsInNlYXJjaCI6Ik0iLCJoaWdobGlnaHRlZCI6MTM5Mywic2VsZWN0ZWQiOlsxMzQ2XSwidG9wIjowLCJzd2Fuc29uIjowfQ

// Wheel Blues
// https://atlas.internationalbrainlab.org/?state=eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImZzZXQiOiJid21fd2hlZWxfc3BlZWQiLCJmbmFtZSI6ImRlY29kaW5nX2VmZmVjdCIsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJzZWFyY2giOiIiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOlsxOTc1LDIzMTYsMjMwMywyMzA2LDI0MTJdLCJ0b3AiOjAsInN3YW5zb24iOjB9

// Velocity Blues
// https://atlas.internationalbrainlab.org/?state=eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImZzZXQiOiJid21fd2hlZWxfdmVsb2NpdHkiLCJmbmFtZSI6ImRlY29kaW5nX2VmZmVjdCIsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJzZWFyY2giOiIiLCJoaWdobGlnaHRlZCI6MjQxMiwic2VsZWN0ZWQiOlsxNjAwLDEzOTMsMjMzMSwyMzAzLDI0MTJdLCJ0b3AiOjAsInN3YW5zb24iOjB9

const ALIAS_STATES = {
    "bwm_choice": "eyJjbWFwIjoiWWxPclJkIiwiY21hcG1pbiI6MCwiY21hcG1heCI6MTAwLCJmc2V0IjoiYndtX2Nob2ljZSIsImZuYW1lIjoiZGVjb2RpbmdfZWZmZWN0Iiwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsInNlYXJjaCI6IiIsImhpZ2hsaWdodGVkIjoyMzAzLCJzZWxlY3RlZCI6WzE5NzMsMjE3MiwyMjQxLDIzMDNdLCJ0b3AiOjAsInN3YW5zb24iOjB9",
    "bwm_block":
        "eyJjbWFwIjoiUHVycGxlcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9ibG9jayIsImZuYW1lIjoiZGVjb2RpbmdfZWZmZWN0Iiwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsInNlYXJjaCI6Ik0iLCJoaWdobGlnaHRlZCI6MTM5Mywic2VsZWN0ZWQiOlsxMzQ2XSwidG9wIjowLCJzd2Fuc29uIjowfQ",
    "bwm_feedback":
        "eyJjbWFwIjoiUmVkcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9mZWVkYmFjayIsImZuYW1lIjoiZGVjb2RpbmdfZWZmZWN0Iiwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsInNlYXJjaCI6IiIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzE0NjQsMjE2NiwyMTk1LDIyNDcsMjI0MV0sInRvcCI6MCwic3dhbnNvbiI6MH0",
    "bwm_stimulus": "eyJjbWFwIjoiWWxHbiIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwiZnNldCI6ImJ3bV9zdGltdWx1cyIsImZuYW1lIjoiZGVjb2RpbmdfZWZmZWN0Iiwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsInNlYXJjaCI6IiIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzE0OTksMTUyNywyMTU4LDIyNDEsMjMwM10sInRvcCI6MCwic3dhbnNvbiI6MH0",

    // TODO
    "bwm_wheel_speed": "eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImZzZXQiOiJid21fd2hlZWxfc3BlZWQiLCJmbmFtZSI6ImRlY29kaW5nX2VmZmVjdCIsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJzZWFyY2giOiIiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOlsxOTc1LDIzMTYsMjMwMywyMzA2LDI0MTJdLCJ0b3AiOjAsInN3YW5zb24iOjB9",
    "bwm_wheel_velocity": "eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImZzZXQiOiJid21fd2hlZWxfdmVsb2NpdHkiLCJmbmFtZSI6ImRlY29kaW5nX2VmZmVjdCIsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJzZWFyY2giOiIiLCJoaWdobGlnaHRlZCI6MjQxMiwic2VsZWN0ZWQiOlsxNjAwLDEzOTMsMjMzMSwyMzAzLDI0MTJdLCJ0b3AiOjAsInN3YW5zb24iOjB9",

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
        this.fname = state.fname || DEFAULT_FEATURE[this.fset];
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
        console.assert(fset);
        this.fset = fset;
        this.fname = fname || this.fname;
        console.assert(this.fname);
        this.stat = DEFAULT_STAT;
    }
};
