export { State };

import { SLICE_MAX } from "./constants.js";



/*************************************************************************************************/
/* Default state                                                                                 */
/*************************************************************************************************/

const DEFAULT_COLORMAP = "viridis";
const DEFAULT_COLORMAP_MIN = 0;
const DEFAULT_COLORMAP_MAX = 100;

const DEFAULT_FSET = "ephys";
const DEFAULT_FEATURE = {
    "ephys": "psd_alpha",
    "bwm_block": "decoding_median",
    "bwm_choice": "decoding_median",
    "bwm_reward": "decoding_median",
    "bwm_stimulus": "values_median",
};
const DEFAULT_STAT = "mean";

const DEFAULT_MAPPING = "allen";
const DEFAULT_SEARCH = "";
const DEFAULT_HIGHLIGHTED = [];
const DEFAULT_SELECTED = [];



/*************************************************************************************************/
/* State                                                                                         */
/*************************************************************************************************/

class State {
    constructor() {
        let query = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
        });

        // Colormap.
        this.colormap = query.colormap || DEFAULT_COLORMAP;
        this.colormapMin = query.colormapMin || DEFAULT_COLORMAP_MIN;
        this.colormapMax = query.colormapMax || DEFAULT_COLORMAP_MAX;

        // Features.
        this.fset = query.fset || DEFAULT_FSET;
        this.fname = query.fname || DEFAULT_FEATURE[this.fset];
        this.stat = query.stat || DEFAULT_STAT;

        // Slices.
        this.coronal = query.coronal || (SLICE_MAX['coronal'] / 2);
        this.sagittal = query.sagittal || (SLICE_MAX['sagittal'] / 2);
        this.horizontal = query.horizontal || (SLICE_MAX['horizontal'] / 2);

        // Regions.
        this.mapping = query.mapping || DEFAULT_MAPPING;
        this.search = query.search || DEFAULT_SEARCH;
        this.highlighted = query.highlighted || DEFAULT_HIGHLIGHTED;
        this.selected = query.selected || DEFAULT_SELECTED;
    }

    setFset(fset) {
        this.fset = fset;
        this.fname = DEFAULT_FEATURE[fset];
        this.stat = DEFAULT_STAT;
    }
};
