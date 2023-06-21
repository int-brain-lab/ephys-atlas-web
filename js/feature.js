export { Feature };

import { clearStyle, clamp, normalizeValue, rgb2hex, removeClassChildren } from "./utils.js";



/*************************************************************************************************/
/* Feature tree                                                                                  */
/*************************************************************************************************/

class FeatureTree {
    constructor(el) {
        this.el = el;
    }

    setFeatures(features, tree) {
        if (!tree) {
            // Convert a flat array into a flat tree.
            tree = Object.keys(features).reduce((obj, key) => { obj[key] = key; return obj; }, {});
        }
        console.assert(tree);
        const generateTree = (obj) => {
            let html = '';
            for (const key in obj) {
                let fname = obj[key];
                let displayName = key;
                let desc = features[fname] ? features[fname]['short_desc'] : '';

                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    html += `<details><summary>${key}</summary><ul>`;
                    html += generateTree(obj[key]);
                    html += `</ul></details>`;
                } else {
                    html += `<li data-fname="${fname}" data-desc="${desc}">${displayName}</li>`;
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
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.el = document.getElementById('feature-tree');

        this.tree = new FeatureTree(this.el);

        this.setupDispatcher();
        this.setupFeature();
    }

    init() {
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

        this.el.addEventListener('mouseover', (e) => {
            if (e.target.tagName == 'LI') {
                let fname = e.target.dataset.fname;
                let desc = e.target.dataset.desc;
                this.dispatcher.featureHover(this, fname, desc, e);
            }
        });

        this.el.addEventListener('mouseout', (e) => {
            if (e.target.tagName == 'LI') {
                this.dispatcher.featureHover(this, null, null, null);
            }
        });
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    async setBucket(uuid_or_alias) {
        let bucket = await this.model.getBucket(uuid_or_alias);
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
