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
        this.dispatcher.on('unityLoaded', (ev) => {
            this.dispatcher.colors(this, this.getColors());
        });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    clear() {
        clearStyle(this.style);

        // Clear colors in Unity.
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

    getColors(refresh = false) {

        // Get the state information.
        let stat = this.state.stat;
        let cmin = this.state.cmapmin;
        let cmax = this.state.cmapmax;

        // Load the colormap.
        let colors = this.model.getColormap(this.state.cmap);

        // Load the region and features data.
        let regions = this.model.getRegions(this.state.mapping);
        let features = this.state.isVolume ? null : this.model.getFeatures(
            this.state.bucket, this.state.fname, this.state.mapping, refresh);

        // Figure out what hemisphere values we have
        let feature_max = features ? Math.max.apply(null, Object.keys(features['data'])) : null;
        let feature_min = features ? Math.min.apply(null, Object.keys(features['data'])) : null;

        let idx_lr = 1327; // Below idx_lr: right hemisphere. Above: left hemisphere.
        let hasLeft = true; // whether there is at least a left hemisphere region with a value
        let hasRight = true; // whether there is at least a left hemisphere region with a value

        if (feature_max == null || feature_min == null) {
            console.warn("there is no data! skipping region coloring");
            this.dispatcher.spinning(this, false);
            return;
        }
        console.assert(feature_min >= 0);
        console.assert(feature_max > 0);

        if (feature_max <= idx_lr) {
            hasLeft = false;
        }
        if (feature_min > idx_lr) {
            hasRight = false;
        }
        // Here the hasLeft and hasRight values should be set. At least one of them is true.
        console.assert(hasLeft || hasRight);

        let regionColors = {};

        // Go through all regions.
        for (let regionIdx in regions) {
            let region = regions[regionIdx];
            console.assert(region);

            // Region name and acronym.
            let name = region['name'];
            // let acronym = region['acronym'];

            // Which hemisphere this region is in.
            let isLeft = name.includes('left'); // false => isRight :)

            // True iff there is at least another region in that hemisphere with data.
            let dataInHemisphere = (isLeft && hasLeft) || (!isLeft && hasRight);

            // Retrieve the region value.
            let value = features ? features['data'][regionIdx] : null;

            // Region that does not appear in the features? White if there is data in its
            // hemisphere, default allen color otherwise.
            if (!value) {
                if (dataInHemisphere) {
                    regionColors[regionIdx] = '#ffffff'; // white
                }
                // else, do nothing = default allen color.
                continue;
            }
            value = value[stat];

            // Region that appears in the features but with a null value? Grey.
            if (!value) {
                regionColors[regionIdx] = '#d3d3d3'; // grey
                continue;
            }

            // If we make it till here, it means there is a valid value and we can compute the
            // color with the colormap.

            // Compute the color as a function of the cmin/cmax slider values.
            let vmin = features['statistics'][stat]['min'];
            let vmax = features['statistics'][stat]['max'];

            if (this.state.logScale) {
                if (vmin <= 0) {
                    console.error("unable to activate the log scale, all values should be >0");
                }
                else {
                    console.assert(vmin > 0);
                    console.assert(vmax > vmin);

                    value = Math.log(value) / LOG_10;
                    vmin = Math.log(vmin) / LOG_10;
                    vmax = Math.log(vmax) / LOG_10;
                }
            }

            let vdiff = vmax - vmin;

            let vminMod = vmin + vdiff * cmin / 100.0;
            let vmaxMod = vmin + vdiff * cmax / 100.0;
            let normalized = normalizeValue(value, vminMod, vmaxMod);
            console.assert(normalized != null && normalized != undefined);

            // Compute the color.
            let hex = colors[clamp(normalized, 0, 99)];

            regionColors[regionIdx] = hex;
        }

        return regionColors;
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
        let regionColors = this.getColors();

        // Clear the styles.
        this.clear();

        // Go through all regions.
        for (let regionIdx in regionColors) {

            let hex = regionColors[regionIdx];

            // Insert the SVG CSS style with the color.
            this.style.insertRule(`svg path.${mapping}_region_${regionIdx} { fill: ${hex}; }\n`);
        }

        // Register the data to Unity and WebSocket.
        this.dispatcher.data(this, 'regionColors', this.state.fname, regionColors)

        // Hide the spinning mouse cursor.
        this.dispatcher.spinning(this, false);
    }
};
