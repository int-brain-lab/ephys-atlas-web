export { Panel };

import { setOptions } from "./utils.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const FEATURE_NAMES = {
    "ephys": [
        "psd_alpha", "psd_beta", "psd_delta", "psd_gamma", "psd_theta",
        "rms_ap", "rms_lf", "spike_rate",],

    "bwm_block": ["decoding_median", "single_cell_perc", "manifold_distance"],
    "bwm_choice": ["decoding_median", "single_cell_perc", "manifold_distance"],
    "bwm_reward": ["decoding_median", "single_cell_perc", "manifold_distance"],
    "bwm_stimulus": ["decoding_median", "single_cell_perc", "manifold_distance"],
};



/*************************************************************************************************/
/* Panel                                                                                         */
/*************************************************************************************************/

class Panel {
    constructor(db, state, feature, region) {
        this.db = db;
        this.state = state;
        this.feature = feature;
        this.region = region;

        this.imapping = document.getElementById('mapping-dropdown');
        this.ifname = document.getElementById('feature-dropdown');
        this.ifset = document.getElementById('feature-set-dropdown');
        this.icmap = document.getElementById('colormap-dropdown');
        this.istat = document.getElementById('stat-dropdown');
        this.icmapmin = document.getElementById('colormap-min');
        this.icmapmax = document.getElementById('colormap-max');
        this.ireset = document.getElementById('reset-button');

        // TODO: use the state to select the initial values of the DOM elements.

        // Setup the event callbacks that change the global state and update the components.
        this.setupMapping();
        this.setupFset();
        this.setupFname();
        this.setupStat();
        this.setupColormap();
        this.setupColormapMin();
        this.setupColormapMax();
        this.setupResetButton();
    }

    setupMapping() {
        this.imapping.addEventListener('change', (e) => {
            let mapping = e.target.value;
            this.region.set_mapping(mapping);
            this.feature.set_mapping(mapping);
        });
    }

    setupFset() {
        this.ifset.addEventListener('change', (e) => {
            let fset = e.target.value;

            // Update the global state and the Feature component.
            this.feature.set_fset(fset);

            // Update the feature options.
            setOptions(this.ifname, FEATURE_NAMES[fset], this.state.fname);
        });
    }

    setupFname() {
        this.ifname.addEventListener('change', (e) => {
            let fname = e.target.value;
            this.feature.set_fname(fname);
        });
    }

    setupStat() {
        this.istat.addEventListener('change', (e) => {
            let stat = e.target.value;
            this.feature.set_stat(stat);
        });
    }

    setupColormap() {
        this.icmap.addEventListener('change', (e) => {
            let colormap = e.target.value;
            this.feature.set_colormap(colormap);
        });
    }

    setupColormapMin() {
        this.icmapmin.addEventListener('input', (e) => {
            let cmin = e.target.value;
            this.feature.set_colormap_range(cmin, this.state.colormap_max);
        });
    }

    setupColormapMax() {
        this.icmapmax.addEventListener('input', (e) => {
            let cmax = e.target.value;
            this.feature.set_colormap_range(this.state.colormap_min, cmax);
        });
    }

    setupResetButton() {
        this.ireset.addEventListener('click', (e) => {
            if (window.confirm("Are you sure you want to delete the cache and re-download the data?")) {
                this.db.deleteDatabase();
                location.reload();
            }
        });
    }
};
