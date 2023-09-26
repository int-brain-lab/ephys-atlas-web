export { Selector };

import { e2idx, clearStyle } from "./utils.js";



/*************************************************************************************************/
/* Selector                                                                                      */
/*************************************************************************************************/

class Selector {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.clearEl = document.getElementById('clear-selection');
        this.style = document.getElementById('style-selector').sheet;

        this.setupClear();
        this.setupDispatcher();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        this.makeCSS();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupClear() {
        this.clearEl.addEventListener("click", (e) => {
            this.dispatcher.clear(this);
            // this.clear();
        });
    }

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.init(); });

        this.dispatcher.on('toggle', (e) => {
            this.toggle(e.idx);
            this.makeCSS();
        });

        this.dispatcher.on('clear', (e) => { this.clear(); });

        this.dispatcher.on('feature', (e) => { this.makeCSS(); });
        this.dispatcher.on('volume', (e) => { this.makeCSS(); });

        // NOTE: clear the selection when the mapping changes.
        this.dispatcher.on('mapping', (e) => { this.clear(); });
    }

    /* Public functions                                                                          */
    /*********************************************************************************************/

    clear() {
        this.state.selected.clear();
        clearStyle(this.style);
    }

    toggle(idx) {
        // Selected.
        if (!this.state.selected.has(idx)) {
            this.state.selected.add(idx);
        }

        // Unselected.
        else {
            this.state.selected.delete(idx);
        }

        this.makeCSS();

        // HACK: use an event system here instead
        if (app.unity)
            app.unity.setVisibility();
    }

    count() {
        return this.state.selected.size;
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    makeCSS() {
        let mapping = this.state.mapping;
        console.log("recompute selection CSS");

        clearStyle(this.style);

        if (this.state.selected.size > 0) {
            this.style.insertRule(`svg path { fill-opacity: 0.5 !important; }`);
        }
        for (let id of this.state.selected) {
            this.style.insertRule(`svg path.${mapping}_region_${id} { stroke-width: 2px !important; fill-opacity: 0.75 !important; }`);
            this.style.insertRule(`ul#bar-plot-list > li.${mapping}_region_${id} { background-color: var(--bar-select-color); }`);
        }

        // Volume mode.
        if (this.state.volume) {

            // Unselected regions.
            if (this.state.selected.size > 0) {

                let s = `fill: #fff; fill-opacity: 0.25 !important;`;

                this.style.insertRule(`#svg-coronal-container svg path { ${s} }`);
                this.style.insertRule(`#svg-sagittal-container svg path { ${s} }`);
                this.style.insertRule(`#svg-horizontal-container svg path { ${s} }`);
            }

            // Selected regions.
            for (let id of this.state.selected) {

                let s = `stroke-width: 2px; fill-opacity: 0.75 !important;`;

                this.style.insertRule(`#svg-coronal-container svg path.${mapping}_region_${id} { ${s} }`);
                this.style.insertRule(`#svg-sagittal-container svg path.${mapping}_region_${id} { ${s} }`);
                this.style.insertRule(`#svg-horizontal-container svg path.${mapping}_region_${id} { ${s} }`);

                this.style.insertRule(`ul#bar-plot-list > li.${mapping}_region_${id} { background-color: var(--bar-select-color); }`);
            }
        }
    }
};
