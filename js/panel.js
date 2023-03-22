

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
/* Utils                                                                                         */
/*************************************************************************************************/

function setOptions(select, values, selected) {
    for (let _ in select.options) { select.options.remove(0); }
    for (let val of values) {
        let opt = document.createElement('option');
        opt.text = val;
        opt.value = val;
        if (val == selected) {
            opt.selected = true;
        }
        select.add(opt);
    }
}



/*************************************************************************************************/
/* Panel                                                                                         */
/*************************************************************************************************/

class Panel {
    constructor(state, features) {
        this.state = state;
        this.features = features;

        this.ifname = document.getElementById('feature-dropdown');
        this.ifset = document.getElementById('feature-set-dropdown');
        this.icmap = document.getElementById('colormap-dropdown');
        this.istat = document.getElementById('stat-dropdown');
        this.icmapmin = document.getElementById('colormap-min');
        this.icmapmax = document.getElementById('colormap-max');

        // TODO: use the state to select the initial values of the DOM elements.

        // Setup the event callbacks that change the global state and update the components.
        this.setupFset();
        this.setupFname();
        this.setupStat();
        this.setupColormap();
        this.setupColormapMin();
        this.setupColormapMax();
    }

    setupFset() {
        this.ifset.addEventListener('change', (e) => {
            let fset = e.target.value;

            // Update the global state.
            this.state.fset = fset;
            this.state.fname = DEFAULT_FEATURE[fset];

            // Update the feature options.
            this.features.set_feature(fset, this.state.fname).then(() => {
                setOptions(this.ifname, values, this.state.fname);
            });
        });
    }

    setupFname() {
        this.ifname.addEventListener('change', (e) => {
            let fname = e.target.value;

            // Update the global state.
            this.state.fname = fname;
            this.features.set_feature(this.state.fset, fname).then(() => { });
        });
    }

    setupStat() {
        this.istat.addEventListener('change', (e) => {
            let stat = e.target.value;

            // Update the global state.
            this.state.stat = stat;

            // Update the component.
            this.features.set_stat(stat).then(() => { });
        });
    }

    setupColormap() {
        this.icmap.addEventListener('change', (e) => {
            let colormap = e.target.value;

            // Update the global state.
            this.state.colormap = colormap;

            // Update the component.
            this.features.set_colormap(colormap).then(() => { });
        });
    }

    setupColormapMin() {
        this.icmapmin.addEventListener('change', (e) => {
            let cmin = e.target.value;

            // Update the global state.
            this.state.colormap_min = cmin;

            // Update the component.
            this.features.set_colormap_range(cmin, this.state.colormap_max).then(() => { });
        });
    }

    setupColormapMax() {
        this.icmapmax.addEventListener('change', (e) => {
            let cmax = e.target.value;

            // Update the global state.
            this.state.colormap_max = cmax;

            // Update the component.
            this.features.set_colormap_range(this.state.colormap_min, cmax).then(() => { });
        });
    }
};
