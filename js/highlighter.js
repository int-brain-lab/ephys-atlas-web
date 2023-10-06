export { Highlighter };

import { e2idx, clearStyle } from "./utils.js";



/*************************************************************************************************/
/* Highlighter                                                                                   */
/*************************************************************************************************/

class Highlighter {
    constructor(state, model, dispatcher) {
        console.assert(state);
        console.assert(dispatcher);

        this.state = state;
        this.dispatcher = dispatcher;

        this.style = document.getElementById('style-highlighter').sheet;

        this.setupDispatcher();
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    makeCSS() {
        // console.log("recompute highlight CSS");

        clearStyle(this.style);

        let idx = this.state.highlighted;
        let mapping = this.state.mapping;

        let s = `stroke: #000f; fill: var(--main-accent-color);  stroke-width: 1px;`;
        this.style.insertRule(`svg path.${mapping}_region_${idx} { ${s} }`);

        if (this.state.isVolume) {
            s = `stroke: #000f; fill: #fff; fill-opacity: .5 !important; stroke-width: 1px;`;
            this.style.insertRule(`#svg-coronal-container svg path.${mapping}_region_${idx} { ${s} }`);
            this.style.insertRule(`#svg-sagittal-container svg path.${mapping}_region_${idx} { ${s} }`);
            this.style.insertRule(`#svg-horizontal-container svg path.${mapping}_region_${idx} { ${s} }`);
        }

        s = `background-color: var(--bar-highlight-color);`;
        this.style.insertRule(`#bar-plot li.${mapping}_region_${idx} { ${s} }`);
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.clear(); });
        this.dispatcher.on('highlight', (ev) => { this.highlight(ev.idx); });

        // NOTE: clear the selection when the mapping changes.
        this.dispatcher.on('mapping', (e) => { this.clear(); });
    }

    /* Main functions                                                                            */
    /*********************************************************************************************/

    clear() {
        this.state.highlighted = null;
        clearStyle(this.style);
    }

    highlight(idx) {
        if (!idx) {
            this.clear();
        } else {
            this.state.highlighted = idx;
            this.makeCSS();
        }
    }
};
