export { Feature };

import { clearStyle, clamp, normalizeValue, rgb2hex, removeClassChildren } from "./utils.js";



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

    clear() {
        removeClassChildren(this.el, 'LI', 'selected');
    }

    get(fname) {
        return this.el.querySelector(`[data-fname=${fname}]`);
    }

    select(fname) {
        this.clear();
        if (fname)
            this.get(fname).classList.add('selected');
    }

    selected(fname) {
        return this.get(fname).classList.contains('selected');
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

        this.setupDispatcher();
        this.setupFeature();

        // this.style = document.getElementById('style-features').sheet;
        // this.defaultStyle = document.getElementById('style-default-regions');
        // this.featureName = document.getElementById('bar-fname');
    }

    init() {
        // this.setDefaultColors(this.state.mapping);
        // this.setColormap(this.state.cmap);

        this.setState(this.state);
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('bucket', (ev) => { this.setBucket(ev.uuid_or_alias); });
    }

    setupFeature() {
        this.el.addEventListener('click', (e) => {
            if (e.target.tagName == 'LI') {
                let fname = e.target.dataset.fname;
                if (this.tree.selected(fname))
                    this.selectFeature('');
                else
                    this.selectFeature(fname);
            }
        });
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    async setBucket(uuid_or_alias) {
        let bucket = await this.db.getBucket(uuid_or_alias);
        console.assert(bucket);
        this.tree.setFeatures(bucket.features, bucket.metadata.tree);
    }

    async setState(state) {
        this.setBucket(state.fset);
    }

    selectFeature(fname) {
        console.log(`select feature ${fname}`);
        this.state.fname = fname;
        this.tree.select(fname);
        this.dispatcher.feature(this, fname);
    }

    //     /* Set functions                                                                             */
    //     /*********************************************************************************************/

    //     setDefaultColors(mapping) {
    //         let href = `data/css/default_region_colors_${mapping}.css`;
    //         if (!this.defaultStyle.href.includes(href))
    //             this.defaultStyle.href = href;
    //     }

    //     setColormapRange(cmin, cmax) {
    //         if (cmin >= cmax) {
    //             return;
    //         }
    //         this.state.cmapmin = cmin;
    //         this.state.cmapmax = cmax;
    //         this.update();
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

};
