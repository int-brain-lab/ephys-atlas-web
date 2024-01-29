export { Coloring };

import { normalizeValue, clamp, clearStyle } from "./utils.js";



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

        this.style = document.getElementById('style-regions').sheet;

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
        this.dispatcher.on('reset', (ev) => { this.init(); this.buildColors(); });
        this.dispatcher.on('bucket', (ev) => { this.clear(); });
        this.dispatcher.on('cmap', (ev) => { this.buildColors(); });
        this.dispatcher.on('cmapRange', (ev) => { this.buildColors(); });
        this.dispatcher.on('logScale', (ev) => { this.buildColors(); });
        this.dispatcher.on('feature', (ev) => { if (!ev.isVolume) this.buildColors(); });
        this.dispatcher.on('refresh', (ev) => { this.buildColors({ 'cache': 'reload' }); });
        this.dispatcher.on('mapping', (ev) => { this.buildColors(); });
        this.dispatcher.on('stat', (ev) => { this.buildColors(); });

        // NOTE: when Unity is loaded, send the colors.
        // this.dispatcher.on('unityLoaded', (ev) => {
        //     this.dispatcher.data(this, this.getColors());
        // });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    clear() {
        clearStyle(this.style);

        // Clear colors in WebSocket.
        this.dispatcher.data(this, 'regionColors', '', {});
    }

    _setRegionColor(regionIdx, color) {
        let rule = `svg path.${this.state.mapping}_region_${regionIdx} { fill: ${color}; }\n`;
        this.style.insertRule(rule);
    }

    // _setRegionWhite(regionIdx) {
    //     this._setRegionColor(regionIdx, '#ffffff');
    // }

    // _setRegionGrey(regionIdx) {
    //     this._setRegionColor(regionIdx, '#d3d3d3');
    // }

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
        this.dispatcher.data(this, 'regionColors', this.state.fname, regionColors)

        // Hide the spinning mouse cursor.
        this.dispatcher.spinning(this, false);
    }
};
