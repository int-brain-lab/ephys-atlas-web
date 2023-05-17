export { Region };

import { clearStyle, normalizeValue, displayNumber, throttle, getRegionIdx, clamp } from "./utils.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const SEARCH_ACRONYM_STRING = "acronym=";



/*************************************************************************************************/
/* Region utils                                                                                  */
/*************************************************************************************************/

function makeRegionBar(mapping, regionIdx, value, normalized) {
    return `#bar-plot-container li.${mapping}_region_${regionIdx} .bar { width: ${normalized}%; } /* TTv: ${value} */`;
}



function makeRegionItem(mapping, idx, acronym, name) {
    let hemisphere = name.includes("(left") ? "left" : "right";
    return `
    <li class="${mapping}_region_${idx}"
        data-acronym="${acronym}"
        data-name="${name}"
        data-hemisphere="${hemisphere}">
        <div class="acronym">${acronym}</div>
        <div class="bar_wrapper"><div class="bar"></div></div>
    </li>
    `;
}



/*************************************************************************************************/
/* Region                                                                                        */
/*************************************************************************************************/

class Region {
    constructor(db, state, feature, highlighter, selector) {
        this.db = db;
        this.state = state;
        this.feature = feature;
        this.highlighter = highlighter;
        this.selector = selector;

        // UL element with the list of brain regions.
        this.regionList = document.getElementById('bar-plot-list');
        this.selectedBar = document.getElementById('bar-selected-list');
        this.featureMin = document.querySelector('#bar-scale .min');
        this.featureMax = document.querySelector('#bar-scale .max');

        this.searchInput = document.getElementById("search-input");

        this.setupSearch();
        this.setupHighlight();
        this.setupSelection();
    }

    init() {
        this.setState(this.state);
        this.update();
        this.setColormap();
    }

    setColormap() {
        this.colors = this.db.getColormap(this.state.cmap)
        this.updateColormap(this.state.cmapmin, this.state.cmapmax);
    }

    setState(state) {
        this.setMapping(state.mapping);

        this.searchInput.value = state.search;
        this.search(state.search);
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupSearch() {
        this.searchInput.addEventListener("input", (e) => {
            this.search(e.target.value);
        });
    }

    setupHighlight() {
        this.regionList.addEventListener('mousemove', throttle((e) => {
            if (e.target.tagName == 'LI') {
                this.highlighter.highlight(e);
            }
        }, 50));
    }

    setupSelection() {
        for (let container of [this.regionList, this.selectedBar]) {
            container.addEventListener('click', (e) => {
                if (e.target.tagName == 'LI') {
                    // Update the Selector object.
                    this.selector.toggle(e);

                    // Update the "selected regions" area in the bar plot header.
                    this.updateSelection();
                }
            });
        }
    }

    /* Region functions                                                                          */
    /*********************************************************************************************/

    setMapping(name) {
        this.state.mapping = name;
        this.makeRegionItems();
        this.update();
    }

    makeRegionItems() {
        let regions = this.db.getRegions(this.state.mapping);
        console.assert(regions);
        // regions = regions.sort((a, b) => a['idx'] - b['idx']);
        let s = "";
        for (let idx in regions) {
            let region = regions[idx];
            console.assert(region);
            // NOTE: skip void region
            if (region["acronym"] == "void") continue;

            s += makeRegionItem(
                this.state.mapping, idx, region["acronym"], region["name"]);
        }
        this.regionList.innerHTML = s;
    }

    updateColormap(cmin, cmax) {
        if (!this.colors) return;
        let colors = this.colors;
        let nTotal = colors.length;
        let barScale = document.querySelector('#bar-scale .colorbar');
        let n = 50;
        let child = null;
        if (barScale.children.length == 0) {
            for (let i = 0; i < n; i++) {
                child = document.createElement('div');
                child.classList.add(`bar-${i}`);
                barScale.appendChild(child);
            }
        }
        let children = barScale.children;
        let x = 0;
        for (let i = 0; i < n; i++) {
            child = children[i];
            x = i * 100.0 / n;
            x = (x - cmin) / (cmax - cmin);
            x = clamp(x, 0, .9999);
            child.style.backgroundColor = colors[Math.floor(x * nTotal)];
        }
    }

    async update() {
        let stat = this.state.stat;
        let mapping = this.state.mapping;

        let features = await this.feature.getFeatures();
        if (!features) {
            console.debug(`loading default colors for unknown feature ${this.state.fname} (fset is ${this.state.fset})`);
            return;
        }

        // Find vmin and vmax.
        let stats = features['statistics'][stat];
        let vmin = stats['min'];
        let vmax = stats['max'];

        this.featureMin.innerHTML = displayNumber(vmin);
        this.featureMax.innerHTML = displayNumber(vmax);

        let values = features['data'];

        let search = this.state.search || '';
        search = search.toLowerCase();

        let style = '';
        let regions = this.db.getRegions(mapping);
        for (let regionIdx in regions) {
            let region = regions[regionIdx];
            console.assert(region);
            let name = region["name"];
            let acronym = region["acronym"];
            let value = values[regionIdx];
            if (!value) {
                if (name.includes("(left")) {
                    // left hemisphere region with no value: in grey
                    style += `:root { --region-${mapping}-${regionIdx}: #ffffff;}\n`;
                }
                continue;
            }
            value = value[stat];

            if (value == 0) {
                if (name.includes("(left")) {
                    // left hemisphere region with no value: in grey
                    style += `:root { --region-${mapping}-${regionIdx}: #d3d3d3;}\n`;
                }
                continue;
            }

            let normalized = normalizeValue(value, vmin, vmax);

            let stl = makeRegionBar(mapping, regionIdx, value, normalized);
            style += `${stl}\n`;

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

            let display = do_show ? 'block' : 'none';

            stl = `#bar-plot li.${mapping}_region_${regionIdx}{display: ${display};}`;
            style += `${stl}\n`;
        }

        document.getElementById('style-regions').textContent = style;

        this.updateSelection();
    }

    getInfo(regionIdx) {
        let regions = this.db.getRegions(this.state.mapping);
        let region = regions[regionIdx];
        if (region) return region;
        console.warn(`region #${regionIdx} could not be found`);
    }

    async getAttribute(regionIdx, attribute) {
        return await this.getInfo(reginIdx)[attribute];
    }

    async getName(regionIdx) {
        return await this.getAttribute(regionIdx, 'name');
    }

    async getAcronym(regionIdx) {
        return await this.getAttribute(regionIdx, 'acronym');
    }

    /* Selection functions                                                                       */
    /*********************************************************************************************/

    getSelectedRegionElements() {
        /* Return the list of LI elements that are selected. */
        let out = [];
        for (let child of this.regionList.children) {
            if (window.getComputedStyle(child, null).display == 'none') continue;
            let idx = getRegionIdx(this.state.mapping, child);
            if (this.state.selected.has(idx)) {
                out.push(child);
            }
        }
        return out;
    }

    clearSelection() {
        this.selectedBar.innerHTML = '';
    }

    updateSelection() {
        // Update the selected bar.
        this.clearSelection();
        for (let item of this.getSelectedRegionElements()) {
            this.selectedBar.appendChild(item.cloneNode(true))
        }
    }

    search(query) {
        this.state.search = query;
        this.update();
        return;

        // let mapping = this.state.mapping;

        // clearStyle(this.styleSearch);
        // if (!query) return;

        // // TODO: only keep li items with a non-null value

        // // Hide all items except those that match the query, using a CSS selector.
        // this.styleSearch.insertRule(`
        // #bar-plot li{
        //     /*display: none !important;*/
        //     /* visibility: hidden; */
        // }`
        // );

        // // Select with CSS the LI items that contain the query in their acronym or name.
        // this.styleSearch.insertRule(`
        // #bar-plot li[data-hemisphere$='left'][class^='${mapping}'][data-acronym*='${query}' i],
        // #bar-plot li[data-hemisphere$='left'][class^='${mapping}'][data-name*='${query}' i]
        // {
        //     visibility: visible;
        // }
        // `);
    }
};
