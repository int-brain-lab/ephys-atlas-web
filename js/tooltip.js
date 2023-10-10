export { Tooltip };

import { e2idx, displayNumber, } from "./utils.js";



/*************************************************************************************************/
/* Tooltip                                                                                       */
/*************************************************************************************************/

class Tooltip {
    constructor(state, model, dispatcher) {

        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.info = document.getElementById('region-info');

        this.setupDispatcher();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.hide(); });

        this.dispatcher.on('highlight', async (ev) => {
            if (!ev.idx) {
                this.hide();
            }
            else {
                let text = await this.getRegionText(ev.idx);
                this.setPosition(ev.e);
                this.setText(text);
            }
        });

        this.dispatcher.on('featureHover', async (ev) => {
            if (!ev.desc) {
                this.hide();
            }
            else {
                this.setPosition(ev.e);
                this.setText(ev.desc);
            }
        });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    getRegionText(regionIdx) {
        if (!regionIdx) {
            return '';
        }

        let info = this.model.getRegions(this.state.mapping)[regionIdx];

        let fet = this.state.isVolume ? null : this.model.getFeatures(this.state.bucket, this.state.mapping, this.state.fname);

        // Triggered when hovering over a Swanson region that does not exist in the mapping, or
        // a region in the right hemisphere.
        if (!info) {
            return "";
        }
        else {
            let name = info['name'];
            let acronym = info['acronym'];
            let value = null;
            let valueDisplay = '';

            if (!fet) {
                valueDisplay = '';
            }

            else if (fet && fet['data'] && fet['data'][regionIdx]) {
                value = fet['data'][regionIdx][this.state.stat];
                if (value)
                    valueDisplay = displayNumber(value);
                else
                    valueDisplay = "(not significant";
            }
            else {
                valueDisplay = "(not included)";
            }

            return `<strong>${acronym}, ${name}</strong><br>${valueDisplay}`;
        }
    }

    async setText(text) {
        // NOTE: text may contain HTML tags
        if (!text) {
            this.hide();
            return;
        }
        this.info.innerHTML = text;
        this.show();
    }

    async setPosition(e) {
        if (!e) {
            this.hide();
            return;
        }
        this.info.style.left = `${e.clientX + 10}px`;
        this.info.style.top = `${e.clientY + 10}px`;
        this.show();
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
