export { Feature };

import { clearStyle, clamp, normalizeValue } from "./utils.js";
import { DEFAULT_FEATURE } from "./state.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/





/*************************************************************************************************/
/* Feature                                                                                       */
/*************************************************************************************************/

class Feature {
    constructor(db, state) {
        this.db = db;
        this.state = state;

        this.style = document.getElementById('style-features').sheet;
        this.defaultStyle = document.getElementById('style-default-regions');
        // this.featureName = document.getElementById('bar-fname');
    }

    init() {
        this.setDefaultColors();
        this.setColormap(this.state.cmap);
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    setMapping(name) {
        this.state.mapping = name;
        this.update();
    }

    // Change the current feature set.
    setFset(fset, fname) {
        this.state.setFset(fset, fname); // will also change the fname.
        this.update();
    }

    // Change a feature within the current feature set.
    setFname(fname) {
        this.state.fname = fname;
        this.update();
    }

    // set the stat: mean, std, min, max
    setStat(stat) {
        this.state.stat = stat;
        this.update();
    }

    /* Colormap functions                                                                        */
    /*********************************************************************************************/

    async setColormap(cmap) {
        this.state.cmap = cmap;
        this.colors = (await this.db.getColormap(this.state.cmap))['colors'];
        this.update();
    }

    setColormapRange(cmin, cmax) {
        if (cmin >= cmax) {
            return;
        }
        this.state.cmapmin = cmin;
        this.state.cmapmax = cmax;
        this.update();
    }

    makeHex(normalized) {
        return this.colors[clamp(normalized, 0, 99)];
    }

    makeRegionColor(mapping, regionIdx, value, hex) {
        return `svg path.${mapping}_region_${regionIdx} { fill: ${hex}; } /* FRP5: ${value} */`;
    }

    /* Feature functions                                                                         */
    /*********************************************************************************************/

    async getFeatures() {
        // dict {mapping: {data: {idx: {mean...}, statistics: {mean: xxx, ...}, statistics: {mean: {mean: ...}, ...}}}
        let fet = await this.db.getFeatures(this.state.fset, this.state.mapping, this.state.fname);
        return fet;
    }

    setDefaultColors() {
        this.defaultStyle.href = `data/css/default_region_colors_${this.state.mapping}.css`;
    }

    async update() {
        // this.featureName.innerHTML = `fet: ${this.state.fname}`;
        this.setDefaultColors();

        let fet = (await this.getFeatures());

        if (!fet) {
            // Default colors: the original region colors. Nothing to do apart from clearing the extra feature-dependent styling.
            console.debug(`loading default colors for unknown feature ${this.state.fname} (fset is ${this.state.fset})`);
            clearStyle(this.style);
            return;
        }
        let stat = this.state.stat;

        // dict {mean: xxx, ...}
        let stats = fet["statistics"];

        let mapping = this.state.mapping;
        let cmap = this.state.cmap;
        let cmin = this.state.cmapmin;
        let cmax = this.state.cmapmax;

        // dict {idx: {mean...}, statistics: {mean: xxx, ...}
        let data = fet["data"];

        if (!stats[stat]) return;

        // Initial vmin-vmax cmap range.
        let vmin = stats[stat]["min"];
        let vmax = stats[stat]["max"];

        // Colormap range modifier using the min/max sliders.
        let vdiff = vmax - vmin;
        let vminMod = vmin + vdiff * cmin / 100.0;
        let vmaxMod = vmin + vdiff * cmax / 100.0;

        clearStyle(this.style);

        for (let regionIdx in data) {
            let value = data[regionIdx][stat];
            // console.log(value);
            let normalizedMod = normalizeValue(value, vminMod, vmaxMod);
            let hex = this.makeHex(normalizedMod);
            let stl = this.makeRegionColor(mapping, regionIdx, value, hex);
            this.style.insertRule(stl);
        }
    }

    getColor(regionIdx) {
        const ruleList = this.style.cssRules;
        const CSS_REGEX = new RegExp(`svg path\.${this.state.mapping}_region_${regionIdx} \{ fill: (.+); \}`);
        for (let rule of ruleList) {
            let m = rule.cssText.match(CSS_REGEX);
            if (m) {
                let rgb = m[1];
                rgb = rgb.split(',');

                let r = parseInt(rgb[0].substring(4));
                let g = parseInt(rgb[1]);
                let b = parseInt(rgb[2]);

                r = r.toString(16).padStart(2, '0');
                g = g.toString(16).padStart(2, '0');
                b = b.toString(16).padStart(2, '0');

                let hex = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
                return hex;
            }
        }
    }

    async get(regionIdx) {
        // Return the feature value of a given region.
        // This depends on the currently-selected feature set, feature, stat.
        let data = (await this.getFeatures());
        if (!data) {
            // console.warn(`unable to get feature for region ${regionIdx}`);
            return;
        }
        data = data['data'];
        if (data && data[regionIdx])
            return data[regionIdx][this.state.stat];
    }
};
