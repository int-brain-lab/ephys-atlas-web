export { Panel };

import { clamp, setOptions, throttle } from "./utils.js";
// import { DEFAULT_FEATURE } from "./state.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const CMAP_RANGE_THROTTLE = 100; // number of milliseconds between updates


/*************************************************************************************************/
/* Panel                                                                                         */
/*************************************************************************************************/

class Panel {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.imapping = document.getElementById('mapping-dropdown');
        this.ifname = document.getElementById('feature-tree');
        this.ibucket = document.getElementById('bucket-dropdown');
        this.icmap = document.getElementById('colormap-dropdown');
        this.istat = document.getElementById('stat-dropdown');
        this.icmapmin = document.getElementById('colormap-min');
        this.icmapmax = document.getElementById('colormap-max');
        this.iclog = document.getElementById('log-scale');
        this.ibreset = document.getElementById('reset-view-button');
        this.ibclear = document.getElementById('clear-cache-button');
        this.ishare = document.getElementById('share-button');

        // Setup the event callbacks that change the global state and update the components.
        this.setupMapping();
        this.setupStat();
        this.setupColormap();
        this.setupColormapMin();
        this.setupColormapMax();
        this.setupLogScale();

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

        // Log scale.
        this.setLogScale(state.logScale);
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

    setLogScale(logScale) {
        console.log("log scale", logScale);
        this.iclog.checked = logScale;
    }

    share() {
        this.dispatcher.share(this);
    }

    // if (this.unity)
    //     this.unity.update();
    // }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupMapping() {
        this.imapping.addEventListener('change', (e) => {
            this.state.mapping = this.imapping.value;
            this.dispatcher.mapping(this, this.state.mapping);
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

    setupLogScale() {
        this.iclog.addEventListener(
            'change', (e) => {
                this.state.logScale = e.target.checked;
                this.dispatcher.logScale(this, this.state.logScale);
            });
    }

    /* Buttons                                                                                   */
    /*********************************************************************************************/

    setupClearButton() {
        this.ibclear.addEventListener('click', (e) => {
            if (window.confirm("Are you sure you want to clear the cache and re-download the data?")) {
                // this.model.deleteDatabase();

                if ('caches' in window) {
                    caches.keys().then(cacheNames => {
                        cacheNames.forEach(cacheName => {
                            caches.delete(cacheName);
                        });
                    });
                }

                location.reload();
            }
        });
    }

    setupResetButton() {
        this.ibreset.addEventListener('click', (e) => {
            if (window.confirm("Are you sure you want to reset the view?")) {
                this.state.reset(); // NOTE: this keeps the list of buckets intact
                this.dispatcher.reset(this);

                // Update the panel controls.
                this.init();

                // Reset the browser URL.
                const url = new URL(window.location);
                url.searchParams.set('state', '');
                window.history.pushState(null, '', url.toString());
            }
        });
    }

    setupShareButton() {
        this.ishare.addEventListener('click', (e) => {
            this.share();
        });
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
