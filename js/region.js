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



function updateSort(list, icon, state) {
    let items = Array.from(list.children);

    if (state === 0) {
        icon.textContent = "↕️"; // Unsorted state
        items.sort((a, b) => parseInt(a.getAttribute("data-idx")) - parseInt(b.getAttribute("data-idx")));
    } else if (state === 1) {
        icon.textContent = "⬇️"; // Descending state
        items.sort((a, b) => parseInt(b.getAttribute("data-value")) - parseInt(a.getAttribute("data-value")));
    } else {
        icon.textContent = "⬆️"; // Ascending state
        items.sort((a, b) => parseInt(a.getAttribute("data-value")) - parseInt(b.getAttribute("data-value")));
    }

    items.forEach(item => list.appendChild(item)); // Reorder elements
}



function cycleSort(list, icon) {
    let state = parseInt(list.getAttribute("data-sort-state")) || 0;
    state = (state + 1) % 3; // Cycle through 0 (unsorted), 1 (ascending), 2 (descending)
    list.setAttribute("data-sort-state", state);
    updateSort(list, icon, state);
}



function makeRegionItem(mapping, idx, acronym, name, normalized = 0) {
    let hemisphere = name.includes("(left") ? "left" : "right";
    return `
    <li class="${mapping}_region_${idx}"
            data-acronym="${acronym}"
            data-idx="${idx}"
            data-name="${name}"
            data-value="${normalized}"
            data-hemisphere="${hemisphere}">
        <div class="acronym">${acronym}</div>
        <div class="bar_wrapper"><div class="bar" style="width: ${normalized}%;"></div></div>
    </li>
    `;

    // // Create the <li> element
    // const listItem = document.createElement('li');
    // listItem.className = `${mapping}_region_${idx}`;
    // listItem.setAttribute('data-acronym', acronym);
    // listItem.setAttribute('data-idx', idx);
    // listItem.setAttribute('data-name', name);
    // listItem.setAttribute('data-hemisphere', hemisphere);

    // // Create the <div> element for acronym
    // const acronymDiv = document.createElement('div');
    // acronymDiv.className = 'acronym';
    // acronymDiv.textContent = acronym;

    // // Create the <div> elements for the bar
    // const barWrapperDiv = document.createElement('div');
    // barWrapperDiv.className = 'bar_wrapper';
    // const barDiv = document.createElement('div');
    // barDiv.className = 'bar';
    // barDiv.style.width = `${normalized}%`;

    // // Append the div elements to the <li> element
    // barWrapperDiv.appendChild(barDiv);
    // listItem.appendChild(acronymDiv);
    // listItem.appendChild(barWrapperDiv);

    // return listItem;
}



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
        // let items = [];
        for (let idx in regions) {
            let region = regions[idx];

            // NOTE: skip void region
            if (region['acronym'] == 'void') continue;
            // items.push(makeRegionItem(
            s += makeRegionItem(
                mapping, idx, region['acronym'], region['name'], region['normalized']);
        }
        // this.el.replaceChildren(...items);
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
        this.sortButton = document.getElementById('bar-plot-sort');
        this.regionTitle = document.getElementById('bar-plot-title');

        this.regionList = new RegionList(this.state, this.model, this.dispatcher, this.el);

        this.setupDispatcher();
        this.setupSortButton();
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

        this.dispatcher.on('feature', (ev) => {
            if (!this.state.isVolume && ev.fname) {
                // If the selected feature has no data for the current mapping, change the mapping.
                const mappings = this.model.getFeaturesMappings(this.state.bucket, ev.fname);
                if (mappings && !mappings.includes(this.state.mapping)) {
                    const mapping = mappings[0];
                    console.warn(`automatically switching to mapping ${mapping} as the selected features do not contain any data with the current mapping`);
                    this.state.mapping = mapping;
                    this.dispatcher.mapping(this, mapping);
                    return;
                }
            }
            this.setRegions();
        });
        this.dispatcher.on('mapping', (ev) => { this.setRegions(); });
        this.dispatcher.on('stat', (ev) => { this.setRegions(); });
        this.dispatcher.on('search', (ev) => { this.setRegions(); });
        this.dispatcher.on('bucket', (ev) => { this.setRegions(); });
    }

    setupSortButton() {
        this.sortButton.onclick = (ev) => {
            cycleSort(this.el, this.sortButton)
        };
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    async setRegions() {
        console.assert(this.state.mapping);
        let regions = this.model.getRegions(this.state.mapping);

        let features = this.state.isVolume ? null : this.model.getFeatures(
            this.state.bucket, this.state.fname, this.state.mapping);
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

        // Register the data to WebSocket.
        this.dispatcher.data(this, 'regionValues', this.state.fname, keptRegions);

        this.regionList.setRegions(this.state.mapping, keptRegions);

        if (this.state.fname)
            this.regionTitle.innerHTML = `${this.state.fname}: ${this.state.stat}`;
        else
            this.regionTitle.innerHTML = '';
        this.sortButton.innerHTML = '↕️';
    }
};
