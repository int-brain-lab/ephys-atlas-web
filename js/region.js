export { Region };

import { clearStyle, normalizeValue, displayNumber, throttle } from "./utils.js";



/*************************************************************************************************/
/* Region utils                                                                                  */
/*************************************************************************************************/

function makeRegionBar(mapping, regionIdx, value, normalized) {
    return `#bar-plot li.${mapping}_region_${regionIdx} .bar { width: ${normalized}%; } /* TTv: ${value} */`;
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
        this.featureMin = document.querySelector('#bar-scale .min');
        this.featureMax = document.querySelector('#bar-scale .max');

        this.searchInput = document.getElementById("search-input");

        this.setupSearch();
        this.setupHighlight();
        this.setupSelection();

        this.setState(this.state);
        this.update();
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
        this.regionList.addEventListener('click', (e) => {
            if (e.target.tagName == 'LI') {
                this.selector.toggle(e);
            }
        });
    }

    /* Region functions                                                                          */
    /*********************************************************************************************/

    setMapping(name) {
        this.state.mapping = name;
        this.makeRegionItems();
        this.update();
    }

    async makeRegionItems() {
        let regions = (await this.db.getRegions(this.state.mapping))['data'];
        regions = regions.sort((a, b) => a['idx'] - b['idx']);
        let s = "";
        for (let region of regions) {
            s += makeRegionItem(
                this.state.mapping, region["idx"], region["acronym"], region["name"]);
        }
        this.regionList.innerHTML = s;
    }

    async update() {
        let stat = this.state.stat;
        let mapping = this.state.mapping;

        let features = await this.feature.getFeatures();

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
        let regions = (await this.db.getRegions(mapping))['data'];
        for (let region of regions) {
            let regionIdx = region["idx"];
            let name = region["name"];
            let acronym = region["acronym"];
            let value = values[regionIdx];
            if (!value) continue;
            value = value[stat];

            let normalized = normalizeValue(value, vmin, vmax);

            let stl = makeRegionBar(mapping, regionIdx, value, normalized);
            // this.style.insertRule(stl);
            style += `${stl}\n`;

            // Implement search.
            let filter = (
                !search ||
                name.toLowerCase().includes(search) ||
                acronym.toLowerCase().includes(search));
            let display = filter ? 'block' : 'none';

            stl = `#bar-plot li.${mapping}_region_${regionIdx}{display: ${display};}`;
            style += `${stl}\n`;
            // this.style.insertRule(stl);
        }

        document.getElementById('style-regions').textContent = style;
        // clearStyle(this.style);
        // this.style.cssText = style;
    }

    async getInfo(regionIdx) {
        let regions = (await this.db.getRegions(this.state.mapping))['data'];
        for (let region of regions) {
            if (region['idx'] == regionIdx) {
                return region;
            }
        }
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
