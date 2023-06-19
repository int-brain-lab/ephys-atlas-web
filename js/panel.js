export { Panel };

import { clamp, setOptions, throttle } from "./utils.js";
// import { DEFAULT_FEATURE } from "./state.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

// const FEATURE_NAMES = {
//     "ephys": [
//         "psd_alpha", "psd_beta", "psd_delta", "psd_gamma", "psd_theta", "rms_ap", "rms_lf", "spike_rate",
//     ],

//     "bwm_block": [
//         "decoding", "single_cell", "manifold", 'euclidean_effect', 'euclidean_latency', 'euclidean_significant', 'glm_effect', 'mannwhitney_effect', 'mannwhitney_significant', 'decoding_effect', 'decoding_frac_significant', 'decoding_significant',
//     ],
//     "bwm_choice": [
//         "decoding", "single_cell", "manifold", 'euclidean_effect', 'euclidean_latency', 'euclidean_significant', 'glm_effect', 'mannwhitney_effect', 'mannwhitney_significant', 'decoding_effect', 'decoding_frac_significant', 'decoding_significant',
//     ],
//     "bwm_feedback": [
//         "decoding", "single_cell", "manifold", 'euclidean_effect', 'euclidean_latency', 'euclidean_significant', 'glm_effect', 'mannwhitney_effect', 'mannwhitney_significant', 'decoding_effect', 'decoding_frac_significant', 'decoding_significant',
//     ],
//     "bwm_stimulus": [
//         "decoding", "single_cell", "manifold", 'euclidean_effect', 'euclidean_latency', 'euclidean_significant', 'glm_effect', 'mannwhitney_effect', 'mannwhitney_significant', 'decoding_effect', 'decoding_frac_significant', 'decoding_significant',
//     ],
// };

const CMAP_RANGE_THROTTLE = 100; // number of milliseconds between updates


/*************************************************************************************************/
/* Panel                                                                                         */
/*************************************************************************************************/

class Panel {
    constructor(state, db, dispatcher) {
        this.state = state;
        this.db = db;
        this.dispatcher = dispatcher;

        this.imapping = document.getElementById('mapping-dropdown');
        this.ifname = document.getElementById('feature-tree');
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
        this.setupStat();
        this.setupColormap();
        this.setupColormapMin();
        this.setupColormapMax();

        this.setupClearButton();
        this.setupShareButton();
        this.setupResetButton();

        this.setupKeyboardShortcuts();
    }

    init() {
        // Use the state to select the initial values of the DOM elements.
        this.setState(this.state);
    }

    setState(state) {
        // Mapping.
        this.setMapping(state.mapping);

        // Stat.
        this.setStat(state.stat);

        // Colormap.
        this.setCmap(state.cmap);

        // Colormap range.
        this.setCmapRange(state.cmapmin, state.cmapmax);
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    setMapping(mapping) {
        this.imapping.value = mapping;
    }

    setStat(stat) {
        this.istat.value = stat;
    }

    setCmap(cmap) {
        this.icmap.value = cmap;
    }

    setCmapRange(cmapmin, cmapmax) {
        this.icmapmin.value = cmapmin;
        this.icmapmax.value = cmapmax;
    }

    // if (this.unity)
    //     this.unity.update();
    // }

    //     // HACK: only Beryl is available for BWM.
    //     if (fset.includes('bwm_')) {
    //         this.imapping.value = 'beryl';
    //         this.region.setMapping(this.imapping.value);
    //     }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupMapping() {
        this.imapping.addEventListener('change', (e) => {
            this.state.mapping = this.imapping.value;
            this.dispatcher.mapping(this, this.state.mapping);

            //     // HACK: only Beryl is available for bwm
            //     if (this.state.fset.includes('bwm_') && mapping != 'beryl') {
            //         return;
            //     }

            //     this.region.setMapping(mapping);
            //     this.feature.setMapping(mapping);
            //     this.selector.clear();

            //     if (this.unity)
            //         this.unity.update();
        });
    }

    setupStat() {
        this.istat.addEventListener('change', (e) => {
            this.state.stat = this.istat.value;
            this.dispatcher.stat(this, this.state.stat);
        });
    }

    setupColormap() {
        this.icmap.addEventListener('change', async (e) => {
            this.state.cmap = this.icmap.value;
            this.dispatcher.cmap(this, this.state.cmap);
        });
    }

    _updateColormapRange() {
        let cmin = Math.min(this.icmapmin.value, this.icmapmax.value);
        let cmax = Math.max(this.icmapmin.value, this.icmapmax.value);

        this.state.cmapmin = cmin;
        this.state.cmapmax = cmax;

        this.dispatcher.cmapRange(this, cmin, cmax);
    }

    setupColormapMin() {
        this.icmapmin.addEventListener(
            'input', throttle((e) => { this._updateColormapRange(); }, CMAP_RANGE_THROTTLE));
    }

    setupColormapMax() {
        this.icmapmax.addEventListener(
            'input', throttle((e) => { this._updateColormapRange(); }, CMAP_RANGE_THROTTLE));
    }

    /* Buttons                                                                                   */
    /*********************************************************************************************/

    setupClearButton() {
        // this.ibclear.addEventListener('click', (e) => {
        //     if (window.confirm("Are you sure you want to clear the cache and re-download the data?")) {
        //         this.db.deleteDatabase();
        //         location.reload();
        //     }
        // });
    }

    setupResetButton() {
        //     this.ibreset.addEventListener('click', (e) => {
        //         if (window.confirm("Are you sure you want to reset the view?")) {
        //             this.state.init({});
        //             this.init();
        //             this.selector.clear();
        //             // TODO: fix this with the new event system

        //             // Reset the browser URL.
        //             const url = new URL(window.location);
        //             url.searchParams.set('state', '');
        //             window.history.pushState(null, '', url.toString());
        //         }
        //     });
    }

    setupShareButton() {
        // this.ishare.addEventListener('click', (e) => {
        //     let url = this.state.toURL();

        //     // DEBUG
        //     // window.location = url;

        //     // Copy the URL to the clipboard.
        //     navigator.clipboard.writeText(url);

        //     // Set the URL in the location bar.
        //     window.history.replaceState(null, '', url.toString());

        //     this.ishare.innerHTML = "copied!";
        //     setTimeout(() => { this.ishare.innerHTML = "share"; }, 1500);
        // });
    }

    /* Keyboard functions                                                                        */
    /*********************************************************************************************/

    setupKeyboardShortcuts() {
        // window.addEventListener('keypress', (e) => {
        //     // NOTE: do not trigger the event when filling in the search bar
        //     if (e.target.id != "search-input") {

        //         // Cycle through the feature names.
        //         if (e.key == "f" || e.key == "d") {
        //             let dir = e.key == "f" ? +1 : -1;
        //             // this.ifname.selectedIndex = clamp(this.ifname.selectedIndex + dir, 0, this.ifname.length - 1);
        //             // this.setFname(this.ifname.value);
        //         }
        //     }
        // });
    }
};
