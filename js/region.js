export { Region };

import { e2idx } from "./utils.js";
import { getRequiredElement } from "./core/dom.js";
import { buildVisibleRegions, compareRegionItems, getRegionTitle, nextSortState } from "./core/region-helpers.js";
import { EVENTS } from "./core/events.js";

function updateSort(list, icon, state) {
    const items = Array.from(list.children).map((item) => ({
        element: item,
        idx: item.getAttribute("data-idx"),
        value: item.getAttribute("data-value"),
    }));

    if (state === 0) {
        icon.textContent = "↕️";
    } else if (state === 1) {
        icon.textContent = "⬇️";
    } else {
        icon.textContent = "⬆️";
    }

    items.sort((a, b) => compareRegionItems(state, a, b));
    items.forEach((item) => list.appendChild(item.element));
}

function cycleSort(list, icon) {
    const state = nextSortState(list.getAttribute("data-sort-state"));
    list.setAttribute("data-sort-state", state);
    updateSort(list, icon, state);
}

function makeRegionItem(mapping, idx, acronym, name, normalized = 0) {
    const hemisphere = name.includes("(left") ? "left" : "right";
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
}

class RegionList {
    constructor(state, dispatcher, el) {
        this.state = state;
        this.dispatcher = dispatcher;
        this.el = el;

        this.setupHighlight();
        this.setupToggle();
    }

    setupHighlight() {
        this.el.addEventListener('mouseover', (e) => {
            if (e.target.tagName === 'LI') {
                const idx = e2idx(this.state.mapping, e);
                this.dispatcher.highlight(this, idx, e);
            }
        });

        this.el.addEventListener('mouseout', (e) => {
            if (e.target.tagName === 'LI') {
                this.dispatcher.highlight(this, null, null);
            }
        });
    }

    setupToggle() {
        this.el.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                const idx = e2idx(this.state.mapping, e);
                this.dispatcher.toggle(this, idx);
            }
        });
    }

    clear() {
        this.el.innerHTML = '';
    }

    setRegions(mapping, regions) {
        let html = '';
        for (const idx in regions) {
            const region = regions[idx];
            if (region.acronym === 'void') {
                continue;
            }
            html += makeRegionItem(mapping, idx, region.acronym, region.name, region.normalized);
        }
        this.el.innerHTML = html;
    }
}

class Region {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.el = getRequiredElement('bar-plot-list');
        this.sortButton = getRequiredElement('bar-plot-sort');
        this.regionTitle = getRequiredElement('bar-plot-title');

        this.regionList = new RegionList(this.state, this.dispatcher, this.el);

        this.setupDispatcher();
        this.setupSortButton();
    }

    async init() {
        await this.setState();
    }

    async setState() {
        await this.setRegions();
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.RESET, () => { this.init(); });

        this.dispatcher.on(EVENTS.FEATURE, (ev) => {
            if (!this.state.isVolume && ev.fname) {
                const mappings = this.model.getFeaturesMappings(this.state.bucket, ev.fname);
                if (mappings && !mappings.includes(this.state.mapping)) {
                    const mapping = mappings[0];
                    console.warn(`automatically switching to mapping ${mapping} as the selected features do not contain any data with the current mapping`);
                    this.state.setMapping(mapping);
                    this.dispatcher.mapping(this, mapping);
                    return;
                }
            }
            this.setRegions();
        });
        this.dispatcher.on(EVENTS.MAPPING, () => { this.setRegions(); });
        this.dispatcher.on(EVENTS.STAT, () => { this.setRegions(); });
        this.dispatcher.on(EVENTS.SEARCH, () => { this.setRegions(); });
        this.dispatcher.on(EVENTS.BUCKET, () => { this.setRegions(); });
    }

    setupSortButton() {
        this.sortButton.onclick = () => {
            cycleSort(this.el, this.sortButton);
        };
    }

    async setRegions() {
        console.assert(this.state.mapping);
        const regions = this.model.getRegions(this.state.mapping);
        const features = this.state.isVolume ? null : this.model.getFeatures(
            this.state.bucket,
            this.state.fname,
            this.state.mapping,
        );
        const keptRegions = buildVisibleRegions(regions, features, this.state.stat, this.state.search);

        this.dispatcher.data(this, 'regionValues', this.state.fname, keptRegions);
        this.regionList.setRegions(this.state.mapping, keptRegions);
        this.regionTitle.innerHTML = getRegionTitle(this.state.fname, this.state.stat);
        this.sortButton.innerHTML = '↕️';
    }
};
