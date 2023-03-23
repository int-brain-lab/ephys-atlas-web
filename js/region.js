export { Region };

import { clearStyle, normalize_value, displayNumber, throttle } from "./utils.js";



/*************************************************************************************************/
/* Region utils                                                                                  */
/*************************************************************************************************/

function make_region_bar(mapping, region_idx, value, normalized) {
    return `#bar-plot li.${mapping}_region_${region_idx} .bar { width: ${normalized}%; } /* TTv: ${value} */`;
}



function make_region_item(mapping, idx, acronym, name) {
    return `
    <li class="${mapping}_region_${idx}" data-acronym="${acronym}" data-name="${name}">
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

        // this.vmin = 0;
        // this.vmax = 1;

        // UL element with the list of brain regions.
        this.regionList = document.getElementById('bar-plot');
        this.featureMin = document.querySelector('#bar-scale .min');
        this.featureMax = document.querySelector('#bar-scale .max');

        this.style = document.getElementById('style-regions').sheet;
        this.styleSearch = document.getElementById('style-search').sheet;

        this.searchInput = document.getElementById("search-input");

        this.setupSearch();
        this.setupHighlight();

        this.set_mapping(this.state.mapping);
        this.update();
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

    set_mapping(name) {
        this.state.mapping = name;
        this.make_region_items();
    }

    async make_region_items() {
        let regions = (await this.db.getRegions(this.state.mapping))['data'];
        let s = "";
        for (let region of regions) {
            s += make_region_item(
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

        clearStyle(this.style);
        let regions = (await this.db.getRegions(this.state.mapping))['data'];
        for (let region of regions) {
            let region_idx = region["idx"];
            let value = values[region_idx];
            if (!value) continue;
            value = value[stat];

            let normalized = normalize_value(value, vmin, vmax);

            let stl = make_region_bar(mapping, region_idx, value, normalized);
            this.style.insertRule(stl);

            // All bars are hidden, except the ones that are present.
            this.style.insertRule(`#bar-plot li.${mapping}_region_${region_idx}{display: block;}`);
        }
    }

    async getName(region_idx) {
        let regions = (await this.db.getRegions(this.state.mapping))['data'];
        console.assert(0 <= region_idx && region_idx < regions.length);
        // console.log(region_idx);
        // console.log(regions);
        // let region = regions.find((region) => { region['idx'] == region_idx });
        let region = regions[region_idx];
        console.assert(region);
        return region['name'];
    }

    search(query) {
        clearStyle(this.styleSearch);
        if (!query) return;

        // Hide all items except those that match the query, using a CSS selector.
        this.styleSearch.insertRule(`
        #bar-plot li{
            display: none !important;
        }`
        );

        // Select with CSS the LI items that contain the query in their acronym or name.
        this.styleSearch.insertRule(`
        #bar-plot li[data-acronym*='${query}' i],
        #bar-plot li[data-name*='${query}' i]
        {
            display: block !important;
        }
        `);
    }
};
