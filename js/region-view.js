import { e2idx } from "./utils.js";
import { compareRegionItems, nextSortState } from "./core/region-helpers.js";

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

function updateSort(list, icon, state) {
    const items = Array.from(list.children).map((item) => ({
        element: item,
        idx: item.getAttribute("data-idx"),
        value: item.getAttribute("data-value"),
    }));

    if (state === 0) {
        icon.textContent = "↕️";
    }
    else if (state === 1) {
        icon.textContent = "⬇️";
    }
    else {
        icon.textContent = "⬆️";
    }

    items.sort((a, b) => compareRegionItems(state, a, b));
    items.forEach((item) => list.appendChild(item.element));
}

export class RegionListView {
    constructor(state, dispatcher, { list, sortButton, title }) {
        this.state = state;
        this.dispatcher = dispatcher;
        this.list = list;
        this.sortButton = sortButton;
        this.title = title;

        this.setupHighlight();
        this.setupToggle();
        this.setupSortButton();
    }

    setupHighlight() {
        this.list.addEventListener('mouseover', (e) => {
            if (e.target.tagName === 'LI') {
                const idx = e2idx(this.state.mapping, e);
                this.dispatcher.highlight(this, idx, e);
            }
        });

        this.list.addEventListener('mouseout', (e) => {
            if (e.target.tagName === 'LI') {
                this.dispatcher.highlight(this, null, null);
            }
        });
    }

    setupToggle() {
        this.list.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                const idx = e2idx(this.state.mapping, e);
                this.dispatcher.toggle(this, idx);
            }
        });
    }

    setupSortButton() {
        this.sortButton.onclick = () => {
            const state = nextSortState(this.list.getAttribute("data-sort-state"));
            this.list.setAttribute("data-sort-state", state);
            updateSort(this.list, this.sortButton, state);
        };
    }

    clear() {
        this.list.innerHTML = '';
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
        this.list.innerHTML = html;
    }

    setTitle(title) {
        this.title.innerHTML = title;
    }

    resetSort() {
        this.sortButton.innerHTML = '↕️';
    }
}
