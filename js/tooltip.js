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
        this.lastRegionText = '';
        this.lastVolumeText = '';
        this.lastPointerEvent = null;

        this.setupDispatcher();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.hide(); });

        this.dispatcher.on('highlight', async (ev) => {
            if (!ev.idx) {
                this.lastRegionText = '';
                this.lastVolumeText = '';
                this.lastPointerEvent = null;
                this.hide();
            }
            else {
                this.lastRegionText = await this.getRegionText(ev.idx);
                this.lastPointerEvent = ev.e;
                this.updateTooltipText();
                this.setPosition(ev.e);
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

        this.dispatcher.on('volumeValues', async (ev) => {
            if (!ev.values) {
                this.lastVolumeText = '';
                this.updateTooltipText();
                return;
            }
            this.lastVolumeText = this.formatVolumeValues(ev.values);
            if (ev.e) {
                this.lastPointerEvent = ev.e;
                this.setPosition(ev.e);
            }
            this.updateTooltipText();
        });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    getRegionText(regionIdx) {
        if (!regionIdx) {
            return '';
        }

        let info = this.model.getRegions(this.state.mapping)[regionIdx];

        let fet = this.state.isVolume ? null : this.model.getFeatures(
            this.state.bucket, this.state.fname, this.state.mapping);

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
            let count = null;
            let countDisplay = '';

            if (!fet) {
                valueDisplay = '';
            }

            else if (fet && fet['data'] && fet['data'][regionIdx]) {
                value = fet['data'][regionIdx][this.state.stat];
                count = fet['data'][regionIdx]["count"];

                if (count)
                    countDisplay = ` (n<sub>channels</sub>=${count})`;
                else
                    countDisplay = '';

                if (value)
                    valueDisplay = `${displayNumber(value)}`;
                else
                    valueDisplay = "(not significant)";

            }
            else {
                valueDisplay = "(not included)";
            }

            return `<strong>${acronym}, ${name}</strong><br>${valueDisplay}${countDisplay}`;
        }
    }

    formatVolumeValues(values) {
        const lines = [];
        const keys = Object.keys(values).sort();
        for (const name of keys) {
            const value = values[name];
            lines.push(`${name}: ${displayNumber(value)}`);
        }
        return lines.join("<br>");
    }

    updateTooltipText() {
        const parts = [];
        if (this.lastRegionText) {
            parts.push(this.lastRegionText);
        }
        if (this.lastVolumeText) {
            parts.push(this.lastVolumeText);
        }
        const combined = parts.join("<br>");
        this.setText(combined);
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
