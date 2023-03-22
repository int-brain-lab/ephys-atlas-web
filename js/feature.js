export { Feature };

import { clearStyle, clamp, normalize_value } from "./utils.js";



/*************************************************************************************************/
/* Feature                                                                                       */
/*************************************************************************************************/

class Feature {
    constructor(db, state) {
        this.db = db;
        this.state = state;

        this.style = document.getElementById('style-features').sheet;

        this.set_colormap(this.state.colormap);
    }

    set_mapping(name) {
        this.state.mapping = name;
        this.update();
    }

    // Change a feature within the current feature set.
    set_fname(fname) {
        this.state.fname = fname;
        this.update();
    }

    // set the stat: mean, std, min, max
    set_stat(stat) {
        this.state.stat = stat;
        this.update();
    }

    async getFeatures() {
        let fet = await this.db.getFeatures(this.state.fset, this.state.mapping, this.state.fname);
        return fet;
    }

    async set_colormap(cmap) {
        this.state.colormap = cmap;
        console.log(this.state.colormap);
        this.colors = (await this.db.getColormap(this.state.colormap))['colors'];
        this.update();
    }

    set_colormap_range(cmin, cmax) {
        this.state.colormap_min = cmin;
        this.state.colormap_max = cmax;
        this.update();
    }

    make_hex(normalized) {
        return this.colors[clamp(normalized, 0, 99)];
    }

    make_region_color(mapping, region_idx, value, normalized) {
        let hex = this.make_hex(normalized);
        return `svg path.${mapping}_region_${region_idx} { fill: ${hex}; } /* FRP5: ${value} */`;
    }

    async update() {
        let fet = (await this.getFeatures());

        if (!fet) {
            console.error(`feature ${this.state.fname} is invalid`);
            return;
        }
        let stat = this.state.stat;

        // dict {mean: xxx, ...}
        let stats = fet["statistics"];

        let mapping = this.state.mapping;
        let cmap = this.state.colormap;
        let cmin = this.state.colormap_min;
        let cmax = this.state.colormap_max;

        // dict {idx: {mean...}, statistics: {mean: xxx, ...}
        let data = fet["data"];

        if (!stats[stat]) return;

        // Initial vmin-vmax colormap range.
        let vmin = stats[stat]["min"];
        let vmax = stats[stat]["max"];

        // Colormap range modifier using the min/max sliders.
        let vdiff = vmax - vmin;
        let vminMod = vmin + vdiff * cmin / 100.0;
        let vmaxMod = vmin + vdiff * cmax / 100.0;

        clearStyle(this.style);

        for (let region_idx in data) {
            let value = data[region_idx][stat];
            // console.log(value);
            let normalizedMod = normalize_value(value, vminMod, vmaxMod);
            let stl = this.make_region_color(mapping, region_idx, value, normalizedMod);
            this.style.insertRule(stl);
        }
    }

    async get(region_idx) {
        // Return the feature value of a given region.
        // This depends on the currently-selected feature set, feature, stat.
        let data = (await this.getFeatures())['data'];
        if (data && data[region_idx])
            return data[region_idx][this.state.stat];
    }
};
