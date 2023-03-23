export { Feature };

import { clearStyle, clamp, normalizeValue } from "./utils.js";



/*************************************************************************************************/
/* Feature                                                                                       */
/*************************************************************************************************/

class Feature {
    constructor(db, state) {
        this.db = db;
        this.state = state;

        this.style = document.getElementById('style-features').sheet;
        this.featureName = document.getElementById('bar-fname');

        this.setColormap(this.state.cmap);
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    setMapping(name) {
        this.state.mapping = name;
        this.update();
    }

    // Change the current feature set.
    setFset(fset) {
        this.state.setFset(fset); // will also change the fname.
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

    makeRegionColor(mapping, regionIdx, value, normalized) {
        let hex = this.makeHex(normalized);
        return `svg path.${mapping}_region_${regionIdx} { fill: ${hex}; } /* FRP5: ${value} */`;
    }

    /* Feature functions                                                                         */
    /*********************************************************************************************/

    async getFeatures() {
        let fet = await this.db.getFeatures(this.state.fset, this.state.mapping, this.state.fname);
        return fet;
    }

    async update() {
        this.featureName.innerHTML = `feature: ${this.state.fname}`;

        let fet = (await this.getFeatures());

        if (!fet) {
            console.error(`feature ${this.state.fname} is invalid`);
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
            let stl = this.makeRegionColor(mapping, regionIdx, value, normalizedMod);
            this.style.insertRule(stl);
        }
    }

    async get(regionIdx) {
        // Return the feature value of a given region.
        // This depends on the currently-selected feature set, feature, stat.
        let data = (await this.getFeatures())['data'];
        if (data && data[regionIdx])
            return data[regionIdx][this.state.stat];
    }
};
