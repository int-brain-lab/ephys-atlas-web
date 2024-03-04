export { DotImage };

import { e2idx, displayNumber, } from "./utils.js";



/*************************************************************************************************/
/* DotImage                                                                                       */
/*************************************************************************************************/

class DotImage {
    constructor(state, model, dispatcher) {

        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.setupDispatcher();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.hide(); });

        this.dispatcher.on('highlightDot', async (ev) => {
            console.log(ev);
        });
    }
};
