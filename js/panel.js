export { Panel };

import { setOptions } from "./utils.js";
import { DEFAULT_FEATURE } from "./state.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const FEATURE_NAMES = {
    "ephys": [
        "psd_alpha", "psd_beta", "psd_delta", "psd_gamma", "psd_theta",
        "rms_ap", "rms_lf", "spike_rate",
    ],

    "bwm_block": [
        "decoding", "single_cell", "manifold",
    ],
    "bwm_choice": [
        "decoding", "single_cell", "manifold",
    ],
    "bwm_reward": [
        "decoding", "single_cell", "manifold",
    ],
    "bwm_stimulus": [
        "decoding", "single_cell", "manifold",
    ],
};



/*************************************************************************************************/
/* Panel                                                                                         */
/*************************************************************************************************/

class Panel {
    constructor(db, state, feature, region, selector, unity) {
        this.db = db;
        this.state = state;
        this.feature = feature;
        this.region = region;
        this.selector = selector;
        this.unity = unity;

        this.imapping = document.getElementById('mapping-dropdown');
        this.ifname = document.getElementById('feature-dropdown');
        this.ifset = document.getElementById('feature-set-dropdown');
        this.icmap = document.getElementById('colormap-dropdown');
        this.istat = document.getElementById('stat-dropdown');
        this.icmapmin = document.getElementById('colormap-min');
        this.icmapmax = document.getElementById('colormap-max');
        this.ibreset = document.getElementById('reset-view-button');
        this.ibclear = document.getElementById('clear-cache-button');
        this.ishare = document.getElementById('share-button');

        // Setup the event callbacks that change the global state and update the components.
        this.setupMapping();
        this.setupFset();
        this.setupFname();
        this.setupStat();
        this.setupColormap();
        this.setupColormapMin();
        this.setupColormapMax();
        this.setupClearButton();
        this.setupShareButton();
        this.setupResetButton();
    }

    init() {
        // Use the state to select the initial values of the DOM elements.
        this.setState(this.state);
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    setState(state) {
        this.imapping.value = state.mapping;

        this.istat.value = state.stat;

        this.icmap.value = state.cmap;
        this.icmapmin.value = state.cmapmin;
        this.icmapmax.value = state.cmapmax;

        this.setFeatureOptions(state.fset, state.fname);
        this.ifset.value = state.fset; // set the fset dropdown value
        this.ifname.value = state.fname; // set the fname dropdown value
        // this.feature.setFname(state.fname);
    }

    setFeatureOptions(fset, fname) {
        // Update the global state and the Feature component.
        // this.feature.setFset(fset);

        // Update the feature options.
        fname = fname || DEFAULT_FEATURE[fset];
        console.assert(FEATURE_NAMES[fset].includes(fname));
        let options = ['-- default --', ...FEATURE_NAMES[fset]];
        setOptions(this.ifname, options, fname);

        // HACK: only Beryl is available for BWM.
        if (fset.includes('bwm_')) {
            this.imapping.value = 'beryl';
            this.region.setMapping(this.imapping.value);
        }
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupMapping() {
        this.imapping.addEventListener('change', (e) => {
            let mapping = e.target.value;

            // HACK: only Beryl is available for bwm
            if (this.state.fset.includes('bwm_') && mapping != 'beryl') {
                return;
            }

            this.region.setMapping(mapping);
            this.feature.setMapping(mapping);
            this.selector.clear();

            if (this.unity)
                this.unity.update();
        });
    }

    setupFset() {
        this.ifset.addEventListener('change', (e) => {
            let fset = e.target.value;
            this.setFeatureOptions(fset); // fname argument not specified => use fset default
            this.feature.setFset(fset, this.ifname.value);
            this.region.update();

            if (this.unity)
                this.unity.update();
        });
    }

    setupFname() {
        this.ifname.addEventListener('change', (e) => {
            let fname = e.target.value;
            this.feature.setFname(fname);
            this.region.update();

            if (this.unity)
                this.unity.update();
        });
    }

    setupStat() {
        this.istat.addEventListener('change', (e) => {
            let stat = e.target.value;
            this.feature.setStat(stat);
            this.region.update();

            if (this.unity)
                this.unity.update();
        });
    }

    setupColormap() {
        this.icmap.addEventListener('change', async (e) => {
            await this.feature.setColormap(e.target.value);

            if (this.unity)
                this.unity.update();
        });
    }

    _updateColormapRange() {
        let cmin = Math.min(this.icmapmin.value, this.icmapmax.value);
        let cmax = Math.max(this.icmapmin.value, this.icmapmax.value);
        this.feature.setColormapRange(cmin, cmax);

        if (this.unity)
            this.unity.update();
    }

    setupColormapMin() {
        this.icmapmin.addEventListener('input', (e) => { this._updateColormapRange(); });
    }

    setupColormapMax() {
        this.icmapmax.addEventListener('input', (e) => { this._updateColormapRange(); });
    }

    setupClearButton() {
        this.ibclear.addEventListener('click', (e) => {
            if (window.confirm("Are you sure you want to clear the cache and re-download the data?")) {
                this.db.deleteDatabase();
                location.reload();
            }
        });
    }

    setupResetButton() {
        this.ibreset.addEventListener('click', (e) => {
            if (window.confirm("Are you sure you want to reset the view?")) {
                this.state.init({});
                this.init();
                this.selector.clear();
                // TODO: fix this with the new event system

                // Reset the browser URL.
                const url = new URL(window.location);
                url.searchParams.set('state', '');
                window.history.pushState(null, '', url.toString());
            }
        });
    }

    setupShareButton() {
        this.ishare.addEventListener('click', (e) => {
            let url = this.state.toURL();

            // DEBUG
            // window.location = url;

            navigator.clipboard.writeText(url);
            this.ishare.innerHTML = "copied!";
            setTimeout(() => { this.ishare.innerHTML = "share"; }, 1500);
        });
    }
};
