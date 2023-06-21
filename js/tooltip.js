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
        this.dispatcher.on('highlight', async (ev) => {
            if (!ev.idx) {
                this.hide();
                return;
            }
            let text = await this.getRegionText(ev.idx);
            this.setPosition(ev.e);
            this.setText(text);
            this.show();
        });

        this.dispatcher.on('featureHover', async (ev) => {
            if (!ev.desc) {
                this.hide();
                return;
            }

            this.setPosition(ev.e);
            this.setText(ev.desc);
            this.show();
        });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    async getRegionText(regionIdx) {
        if (!regionIdx) {
            return '';
        }
        let info = this.db.getRegions(this.state.mapping)[regionIdx];

        let fet = await this.db.getFeatures(this.state.fset, this.state.mapping, this.state.fname);

        // Triggered when hovering over a Swanson region that does not exist in the mapping.
        if (!info) {
            // console.debug(`region ${regionIdx} could not be found`);
            return "(not included)";
        }
        else {
            let name = info['name'];
            let acronym = info['acronym'];
            // console.log(fet['data']);
            let value = (fet && fet['data'] && fet['data'][regionIdx]) ? fet['data'][regionIdx][this.state.stat] : '';
            let meanDisplay = typeof value == 'string' ? value : displayNumber(value);
            if (!name.includes('(left')) meanDisplay = 'reference area';
            return `<strong>${acronym}, ${name}</strong><br>${meanDisplay}`;
        }
    }

    async setText(text) {
        // NOTE: text may contain HTML tags
        if (!text) {
            this.hide();
            return;
        }
        this.info.innerHTML = text;
    }

    async setPosition(e) {
        if (!e) {
            this.hide();
            return;
        }
        this.info.style.left = `${e.clientX + 10}px`;
        this.info.style.top = `${e.clientY + 10}px`;
        this.info.style.visibility = 'visible';
    }

    /* Public functions                                                                          */
    /*********************************************************************************************/

    show() {
        this.info.style.visibility = 'visible';
    }

    hide() {
        this.info.style.visibility = 'hidden';
    }
};
