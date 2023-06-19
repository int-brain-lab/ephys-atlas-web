export { Selector };

import { e2idx, clearStyle } from "./utils.js";



/*************************************************************************************************/
/* Selector                                                                                      */
/*************************************************************************************************/

class Selector {
    constructor(state, db, dispatcher) {
        this.state = state;
        this.db = db;
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
        this.dispatcher.on('toggle', (e) => {
            this.toggle(e.idx);
            this.makeCSS();
        });

        this.dispatcher.on('clear', (e) => { this.clear(); });

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

        clearStyle(this.style);
        if (this.state.selected.size > 0) {
            this.style.insertRule(`svg path { fill-opacity: 0.5; }`);
        }
        for (let id of this.state.selected) {
            this.style.insertRule(`svg path.${mapping}_region_${id} { stroke-width: 3px; fill-opacity: 1.0; }`);
            this.style.insertRule(`ul#bar-plot-list > li.${mapping}_region_${id} { background-color: var(--bar-select-color); }`);
        }
    }
};

