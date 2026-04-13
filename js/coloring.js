export { Coloring };

import { normalizeValue, clamp, clearStyle } from "./utils.js";
import { EVENTS } from "./core/events.js";
import { getRequiredElement, getRequiredSheet } from "./core/dom.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const LOG_10 = Math.log(10.0);



/*************************************************************************************************/
/* Coloring                                                                                      */
/*************************************************************************************************/

class Coloring {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.style = getRequiredSheet('style-regions');
        this.styleDefault = getRequiredElement('style-default-regions');

        this.setupDispatcher();
    }

    init() {
        // this.setState(this.state);
    }

    setState(state) {
        this.buildColors();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on(EVENTS.RESET, (ev) => { this.init(); this.buildColors(); });
        this.dispatcher.on(EVENTS.BUCKET, (ev) => { this.clear(); });
        this.dispatcher.on(EVENTS.CMAP, (ev) => { this.buildColors(); });
        this.dispatcher.on(EVENTS.CMAP_RANGE, (ev) => { this.buildColors(); });
        this.dispatcher.on(EVENTS.LOG_SCALE, (ev) => { this.buildColors(); });
        this.dispatcher.on(EVENTS.FEATURE, (ev) => { if (!ev.isVolume) this.buildColors(); });
        this.dispatcher.on(EVENTS.REFRESH, (ev) => { this.buildColors({ 'cache': 'reload' }); });
        this.dispatcher.on(EVENTS.MAPPING, (ev) => { this.updateDefaultColors(); this.buildColors(); });
        this.dispatcher.on(EVENTS.STAT, (ev) => { this.buildColors(); });

        // NOTE: when Unity is loaded, send the colors.
        // this.dispatcher.on(EVENTS.UNITY_LOADED, (ev) => {
        //     this.dispatcher.data(this, this.getColors());
        // });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    clear() {
        clearStyle(this.style);
        this.updateDefaultColors();

        // Clear colors in WebSocket.
        this.dispatcher.data(this, 'regionColors', '', {});
    }

    updateDefaultColors() {
        this.styleDefault.href = `data/css/default_region_colors_${this.state.mapping}.css`;
    }

    buildColors(refresh = false) {

        // Remove the feature colors when deselecting a feature.
        if (!this.state.fname) {

            // Clear the styles.
            this.clear();

            this.dispatcher.spinning(this, false);
            return;
        }

        // Show the spinning mouse cursor.
        this.dispatcher.spinning(this, true);

        let mapping = this.state.mapping;
        let regionColors = this.model.getColors(this.state);

        // Clear the styles.
        this.clear();

        // Go through all regions.
        for (let regionIdx in regionColors) {

            let hex = regionColors[regionIdx];

            // Insert the SVG CSS style with the color.
            this.style.insertRule(`svg path.${mapping}_region_${regionIdx} { fill: ${hex}; }\n`);
        }

        // Register the data to WebSocket.
        this.dispatcher.data(this, 'regionColors', this.state.fname, regionColors);

        // Hide the spinning mouse cursor.
        this.dispatcher.spinning(this, false);
    }
};
