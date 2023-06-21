export { Coloring };

import { normalizeValue, clamp, clearStyle } from "./utils.js";



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
        this.setState(this.state);
    }

    setState(state) {
        this.buildColors();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('bucket', (ev) => { this.clear(); });
        this.dispatcher.on('cmap', (ev) => { this.buildColors(); });
        this.dispatcher.on('cmapRange', (ev) => { this.buildColors(); });
        this.dispatcher.on('feature', (ev) => { this.buildColors(); });
        this.dispatcher.on('mapping', (ev) => { this.buildColors(); });
        this.dispatcher.on('stat', (ev) => { this.buildColors(); });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    clear() {
        clearStyle(this.style);
    }

    async buildColors() {

        // Load the region and features data.
        let regions = this.model.getRegions(this.state.mapping);
        let features = await this.model.getFeatures(this.state.bucket, this.state.mapping, this.state.fname);

        // Clear the styles.
        this.clear();

        // Remove the feature colors when deselecting a feature.
        if (!this.state.fname) return;

        // Get the state information.
        let mapping = this.state.mapping;
        let stat = this.state.stat;
        let cmap = this.state.cmap;
        let cmin = this.state.cmapmin;
        let cmax = this.state.cmapmax;

        // Load the colormap.
        let colors = this.model.getColormap(this.state.cmap);

        // Go through all regions.
        for (let regionIdx in regions) {
            let region = regions[regionIdx];
            console.assert(region);

            let name = region['name'];

            // Skip the right hemisphere.
            if (!name.includes('(left')) continue;

            let acronym = region['acronym'];
            let value = features['data'][regionIdx];

            // Left hemisphere region that does not appear in the features: white.
            if (!value) {
                this.style.insertRule(`:root { --region-${mapping}-${regionIdx}: #ffffff;}\n`);
                continue;
            }
            value = value[stat];

            // Left hemisphere region that appears in the features but with a null value: grey.
            if (value == 0) {
                this.style.insertRule(`:root { --region-${mapping}-${regionIdx}: #d3d3d3;}\n`);
                continue;
            }

            // Compute the color as a function of the cmin/cmax slider values.
            let vmin = features['statistics'][stat]['min'];
            let vmax = features['statistics'][stat]['max'];
            let vdiff = vmax - vmin;
            let vminMod = vmin + vdiff * cmin / 100.0;
            let vmaxMod = vmin + vdiff * cmax / 100.0;
            let normalized = normalizeValue(value, vminMod, vmaxMod);

            // Compute the color.
            let hex = '';
            if (normalized == null || normalized == undefined) {
                hex = '#d3d3d3';
            }
            else {
                hex = colors[clamp(normalized, 0, 99)];
            }

            // Insert the SVG CSS style with the color.
            this.style.insertRule(`svg path.${mapping}_region_${regionIdx} { fill: ${hex}; } /* ${acronym}: ${value} */\n`);
        }
    }
};


