export { Highlighter };

import { e2idx, clearStyle } from "./utils.js";



/*************************************************************************************************/
/* Highlighter                                                                                   */
/*************************************************************************************************/

class Highlighter {
    constructor(state, db, dispatcher) {
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
        clearStyle(this.style);

        let idx = this.state.highlighted;
        let mapping = this.state.mapping;

        this.style.insertRule(`svg path.${mapping}_region_${idx} { stroke: #000f; fill: var(--main-accent-color); }`);
        this.style.insertRule(`#bar-plot li.${mapping}_region_${idx} { background-color: var(--bar-highlight-color); }`);
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('highlight', (ev) => {
            this.highlight(ev.idx);
        });
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

