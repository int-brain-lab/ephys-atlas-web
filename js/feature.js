export { Feature };

import { clearStyle, clamp, normalizeValue, rgb2hex } from "./utils.js";
// import { DEFAULT_FEATURE } from "./state.js";



/*************************************************************************************************/
/* Feature tree                                                                                  */
/*************************************************************************************************/

class FeatureTree {
    constructor(el) {
        this.el = el;
    }

    setFeatures(fnames, tree) {
        if (!tree) {
            // Convert a flat array into a flat tree.
            tree = fnames.reduce((obj, key) => { obj[key] = key; return obj; }, {});
        }
        console.assert(tree);
        const generateTree = (obj) => {
            let html = '';
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    html += `<details><summary>${key}</summary><ul>`;
                    html += generateTree(obj[key]);
                    html += `</ul></details>`;
                } else {
                    html += `<li data-fname="${obj[key]}">${key}</li>`;
                }
            }
            return html;
        };
        this.el.innerHTML = `<ul>${generateTree(tree)}</ul>`;
    }

    select(fname) {

    }
}



/*************************************************************************************************/
/* Feature                                                                                       */
/*************************************************************************************************/

class Feature {
    constructor(state, db, dispatcher) {
        this.state = state;
        this.db = db;
        this.dispatcher = dispatcher;

        this.el = document.getElementById('feature-tree');

        this.tree = new FeatureTree(this.el);

        this.dispatcher.on('bucket', (ev) => { this.setBucket(ev.uuid_or_alias); });

        //         this.style = document.getElementById('style-features').sheet;
        //         this.defaultStyle = document.getElementById('style-default-regions');
        //         // this.featureName = document.getElementById('bar-fname');
    }

    init() {
        // this.setDefaultColors(this.state.mapping);
        // this.setColormap(this.state.cmap);

        this.setState(this.state);
    }

    async setBucket(uuid_or_alias) {
        let bucket = await this.db.getBucket(uuid_or_alias);
        console.assert(bucket);
        this.tree.setFeatures(bucket.features, bucket.metadata.tree);
    }

    async setState(state) {
        // let features = await this.db.getFeatures(state.fset, state.mapping, state.fname);
        this.setBucket(state.fset);
    }

    //     /* Set functions                                                                             */
    //     /*********************************************************************************************/

    //     setDefaultColors(mapping) {
    //         let href = `data/css/default_region_colors_${mapping}.css`;
    //         if (!this.defaultStyle.href.includes(href))
    //             this.defaultStyle.href = href;
    //     }

    //     setMapping(name) {
    //         this.state.mapping = name;
    //         this.update();
    //     }

    //     // Change the current feature set.
    //     setFset(fset, fname) {
    //         this.state.setFset(fset, fname); // will also change the fname.
    //         this.update();
    //     }

    //     // Change a feature within the current feature set.
    //     setFname(fname) {
    //         this.state.fname = fname;
    //         this.update();
    //     }

    //     // set the stat: mean, std, min, max
    //     setStat(stat) {
    //         this.state.stat = stat;
    //         this.update();
    //     }

    //     setColormap(cmap) {
    //         this.state.cmap = cmap;
    //         this.colors = this.db.getColormap(this.state.cmap);
    //         this.update();
    //     }

    //     setColormapRange(cmin, cmax) {
    //         if (cmin >= cmax) {
    //             return;
    //         }
    //         this.state.cmapmin = cmin;
    //         this.state.cmapmax = cmax;
    //         this.update();
    //     }

    //     /* Internal functions                                                                        */
    //     /*********************************************************************************************/

    //     makeHex(normalized) {
    //         return this.colors[clamp(normalized, 0, 99)];
    //     }

    //     makeRegionColor(mapping, regionIdx, value, hex) {
    //         return `svg path.${mapping}_region_${regionIdx} { fill: ${hex}; } /* FRP5: ${value} */`;
    //     }

    //     /* Get functions                                                                             */
    //     /*********************************************************************************************/

    //     getFeatures() {
    //         // dict {mapping: {data: {idx: {mean...}, statistics: {mean: xxx, ...}, statistics: {mean: {mean: ...}, ...}}}
    //         return this.db.getFeatures(this.state.fset, this.state.mapping, this.state.fname);
    //     }

    //     getColor(regionIdx) {
    //         // Parse the current color of a region and return its hex value.
    //         const ruleList = this.style.cssRules;
    //         const CSS_REGEX = new RegExp(`svg path\.${this.state.mapping}_region_${regionIdx} \{ fill: (.+); \}`);
    //         for (let rule of ruleList) {
    //             let m = rule.cssText.match(CSS_REGEX);
    //             if (m) {
    //                 let rgb = m[1];
    //                 return rgb2hex(rgb);
    //             }
    //         }
    //     }

    //     async get(regionIdx) {
    //         // Return the feature value of a given region.

    //         // This depends on the currently-selected feature set, feature, stat.
    //         let data = await this.getFeatures();
    //         if (!data) {
    //             // console.warn(`unable to get feature for region ${regionIdx}`);
    //             return 'not significant';
    //         }
    //         data = data['data'];
    //         if (data && data[regionIdx])
    //             return data[regionIdx][this.state.stat];
    //         return 'excluded';
    //     }

    //     /* Update function                                                                           */
    //     /*********************************************************************************************/

    //     async update() {
    //         // this.featureName.innerHTML = `fet: ${this.state.fname}`;
    //         this.setDefaultColors(this.state.mapping);

    //         let fet = await this.getFeatures();

    //         if (!fet) {
    //             // Default colors: the original region colors. Nothing to do apart from clearing the extra feature-dependent styling.
    //             console.debug(`loading default colors for unknown feature ${this.state.fname} (fset is ${this.state.fset})`);
    //             clearStyle(this.style);
    //             return;
    //         }
    //         let stat = this.state.stat;

    //         // dict {mean: xxx, ...}
    //         let stats = fet["statistics"];

    //         let mapping = this.state.mapping;
    //         let cmap = this.state.cmap;
    //         let cmin = this.state.cmapmin;
    //         let cmax = this.state.cmapmax;

    //         // dict {idx: {mean...}, statistics: {mean: xxx, ...}
    //         let data = fet["data"];

    //         if (!stats[stat]) return;

    //         // Initial vmin-vmax cmap range.
    //         let vmin = stats[stat]["min"];
    //         let vmax = stats[stat]["max"];

    //         // Colormap range modifier using the min/max sliders.
    //         let vdiff = vmax - vmin;
    //         let vminMod = vmin + vdiff * cmin / 100.0;
    //         let vmaxMod = vmin + vdiff * cmax / 100.0;

    //         clearStyle(this.style);

    //         for (let regionIdx in data) {
    //             let value = data[regionIdx][stat];
    //             let normalizedMod = normalizeValue(value, vminMod, vmaxMod);
    //             let hex = '';
    //             if (normalizedMod == null || normalizedMod == undefined) {
    //                 hex = '#d3d3d3';
    //             }
    //             else {
    //                 hex = this.makeHex(normalizedMod);
    //             }
    //             let stl = this.makeRegionColor(mapping, regionIdx, value, hex);
    //             this.style.insertRule(stl);
    //         }
    //     }
};
