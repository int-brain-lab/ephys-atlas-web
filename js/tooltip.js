export { Tooltip };

import { e2idx, displayNumber, } from "./utils.js";



/*************************************************************************************************/
/* Tooltip                                                                                       */
/*************************************************************************************************/

class Tooltip {
    constructor(state, db, dispatcher) {

        this.state = state;
        this.db = db;
        this.dispatcher = dispatcher;

        this.info = document.getElementById('region-info');

        this.setupDispatcher();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('highlight', (ev) => { this.show(ev.idx, ev.e); });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    async setText(regionIdx) {
        if (!regionIdx) {
            this.info.innerHTML = '';
            this.info.style.visibility = 'hidden';
        }
        else {
            let info = this.db.getRegions(this.state.mapping)[regionIdx];
            let fet = await this.db.getFeatures(this.state.fset, this.state.mapping, this.state.fname);

            // Triggered when hovering over a Swanson region that does not exist in the mapping.
            if (!info) {
                // console.debug(`region ${regionIdx} could not be found`);
                this.info.innerHTML = "(not included)";
            }
            else {
                let name = info['name'];
                let acronym = info['acronym'];
                // console.log(fet['data']);
                let value = (fet && fet['data'] && fet['data'][regionIdx]) ? fet['data'][regionIdx][this.state.stat] : '';
                let meanDisplay = typeof value == 'string' ? value : displayNumber(value);
                if (!name.includes('(left')) meanDisplay = 'reference area';
                this.info.innerHTML = `<strong>${acronym}, ${name}</strong><br>${meanDisplay}`;
            }
        }
    }

    async setPosition(e) {
        if (!e) return;
        this.info.style.left = `${e.clientX + 10}px`;
        this.info.style.top = `${e.clientY + 10}px`;
        this.info.style.visibility = 'visible';
    }

    /* Public functions                                                                          */
    /*********************************************************************************************/

    async show(idx, e) {
        this.info.style.visibility = 'visible';
        this.setText(idx);
        this.setPosition(e);
    }

    hide() {
        this.info.style.visibility = 'hidden';
    }
};
