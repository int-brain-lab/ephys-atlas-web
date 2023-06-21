export { Region };

import { normalizeValue, throttle, e2idx } from "./utils.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const SEARCH_ACRONYM_STRING = "acronym=";



/*************************************************************************************************/
/* Region utils                                                                                  */
/*************************************************************************************************/

function searchFilter(search, acronym, name) {
    search = search.toLowerCase();

    // Implement search.
    let do_show = true;
    if (search) {
        if (search.includes(SEARCH_ACRONYM_STRING)) {
            do_show = acronym.toLowerCase() == search.replace(SEARCH_ACRONYM_STRING, '');
        }
        else {
            do_show = (
                name.toLowerCase().includes(search) ||
                acronym.toLowerCase().includes(search));
        }
    }
    return do_show;
}



function makeRegionItem(mapping, idx, acronym, name, normalized = 0) {
    let hemisphere = name.includes("(left") ? "left" : "right";
    return `
    <li class="${mapping}_region_${idx}"
        data-acronym="${acronym}"
        data-idx="${idx}"
        data-name="${name}"
        data-hemisphere="${hemisphere}">
        <div class="acronym">${acronym}</div>
        <div class="bar_wrapper"><div class="bar" style="width: ${normalized}%;"></div></div>
    </li>
    `;
}



// function setupToggle(el) {
//     el.addEventListener('click', (e) => {
//         if (e.target.tagName == 'LI') {
//             const ev = customItemEvent("toggle", e.target);
//             console.log(`emit toggle event on region ${ev.detail.idx}`);
//             el.dispatchEvent(ev);
//         }
//     });
// }



/*************************************************************************************************/
/* Region list                                                                                   */
/*************************************************************************************************/

class RegionList {
    constructor(state, model, dispatcher, el) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;
        this.el = el;

        this.setupHighlight();
        this.setupToggle();
    }

    setupHighlight() {
        this.el.addEventListener('mouseover', (e) => {
            if (e.target.tagName == 'LI') {
                let idx = e2idx(this.state.mapping, e);
                this.dispatcher.highlight(this, idx, e);
            }
        });

        this.el.addEventListener('mouseout', (e) => {
            if (e.target.tagName == 'LI') {
                this.dispatcher.highlight(this, null, null);
            }
        });
    }

    setupToggle() {
        this.el.addEventListener('click', (e) => {
            if (e.target.tagName == 'LI') {
                let idx = e2idx(this.state.mapping, e);
                this.dispatcher.toggle(this, idx);
            }
        });
    }

    clear() {
        this.el.innerHTML = '';
    }

    setRegions(mapping, regions) { // idx, name, acronym, normalized
        let s = '';
        for (let idx in regions) {
            let region = regions[idx];

            // NOTE: skip void region
            if (region['acronym'] == 'void') continue;
            s += makeRegionItem(
                mapping, idx, region['acronym'], region['name'], region['normalized']);
        }
        this.el.innerHTML = s;
    }
}



/*************************************************************************************************/
/* Region                                                                                        */
/*************************************************************************************************/

class Region {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.el = document.getElementById('bar-plot-list');

        this.regionList = new RegionList(this.state, this.model, this.dispatcher, this.el);

        this.setupDispatcher();
    }

    async init() {
        await this.setState(this.state);
    }

    async setState(state) {
        await this.setRegions();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.init(); });
        this.dispatcher.on('feature', (ev) => { this.setRegions(); });
        this.dispatcher.on('mapping', (ev) => { this.setRegions(); });
        this.dispatcher.on('stat', (ev) => { this.setRegions(); });
        this.dispatcher.on('search', (ev) => { this.setRegions(); });
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    async setRegions() {
        console.assert(this.state.mapping);
        let regions = this.model.getRegions(this.state.mapping);
        let features = await this.model.getFeatures(this.state.bucket, this.state.mapping, this.state.fname);

        let stats = features ? features["statistics"] : undefined;
        let stat = this.state.stat;
        let search = this.state.search;

        // Initial vmin-vmax cmap range.
        let vmin = 0;
        let vmax = 0;
        if (stats) {
            vmin = stats[stat]["min"];
            vmax = stats[stat]["max"];
        }

        let keptRegions = {};
        for (let relIdx in regions) {
            // WARNING: relIdx is NOT the region index

            // NOTE: important, need to make a copy, otherwise the values will be propagated into
            // the object stored in the model.
            let region = { ...regions[relIdx] };
            let regionIdx = region["idx"];

            // Compute the bar width as a function of the feature value.
            // If there is no feature, show the region but without a bar.
            if (stats) {
                let value = features['data'][regionIdx];
                if (!value)
                    continue;
                value = value[stat];
                // if (!value)
                //     continue;
                region['normalized'] = normalizeValue(value, vmin, vmax);
            }

            // Implement search.
            if (search) {
                let acronym = region['acronym'];
                let name = region['name'];
                let match = searchFilter(search, acronym, name);
                if (!match) continue;
            }

            keptRegions[regionIdx] = region;
        }

        this.regionList.setRegions(this.state.mapping, keptRegions);
    }



    /* Internal functions                                                                        */
    /*********************************************************************************************/

    // getSelectedRegionElements() {
    //     /* Return the list of LI elements that are selected. */
    //     let out = [];
    //     for (let child of this.regionList.children) {
    //         if (window.getComputedStyle(child, null).display == 'none') continue;
    //         let idx = getRegionIdx(this.state.mapping, child);
    //         if (this.state.selected.has(idx)) {
    //             out.push(child);
    //         }
    //     }
    //     return out;
    // }


    /* Get functions                                                                             */
    /*********************************************************************************************/

    // getInfo(regionIdx) {
    //     let regions = this.model.getRegions(this.state.mapping);
    //     let region = regions[regionIdx];
    //     if (region)
    //         return region;
    //     // console.warn(`region #${regionIdx} could not be found`);
    // }

    /* Update function                                                                           */
    /*********************************************************************************************/

    // updateColormap(cmin, cmax) {
    //     if (!this.colors) return;
    //     let colors = this.colors;
    //     let nTotal = colors.length;
    //     let barScale = document.querySelector('#bar-scale .colorbar');
    //     let n = 50;
    //     let child = null;
    //     if (barScale.children.length == 0) {
    //         for (let i = 0; i < n; i++) {
    //             child = document.createElement('div');
    //             child.classList.add(`bar-${i}`);
    //             barScale.appendChild(child);
    //         }
    //     }
    //     let children = barScale.children;
    //     let x = 0;
    //     for (let i = 0; i < n; i++) {
    //         child = children[i];
    //         x = i * 100.0 / n;
    //         x = (x - cmin) / (cmax - cmin);
    //         x = clamp(x, 0, .9999);
    //         child.style.backgroundColor = colors[Math.floor(x * nTotal)];
    //     }
    // }
};
