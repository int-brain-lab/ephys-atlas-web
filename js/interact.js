export { Highlighter, Selector, Tooltip };

import { e2idx, clearStyle, displayNumber, getRegionIdx } from "./utils.js";



/*************************************************************************************************/
/* Highlighter                                                                                   */
/*************************************************************************************************/

class Highlighter {
    constructor(state) {
        console.assert(state);
        this.state = state;
        this.style = document.getElementById('style-highlighter').sheet;
    }

    highlight(e) {
        this.state.highlighted = e2idx(this.state.mapping, e);
        this.makeCSS();
    }

    clear() {
        this.state.highlighted = null;
        clearStyle(this.style);
    }

    makeCSS() {
        clearStyle(this.style);

        let idx = this.state.highlighted;
        let mapping = this.state.mapping;

        this.style.insertRule(`svg path.${mapping}_region_${idx} { stroke: #000f; fill: var(--main-accent-color); }`);
        this.style.insertRule(`#bar-plot li.${mapping}_region_${idx} { background-color: var(--bar-highlight-color); }`);
    }
};



/*************************************************************************************************/
/* Selector                                                                                      */
/*************************************************************************************************/

class Selector {
    constructor(state) {
        console.assert(state);
        this.state = state;
        this.style = document.getElementById('style-selector').sheet;
        this.selectedBar = document.getElementById('bar-selected-list');
        this.makeCSS();
    }

    clear() {
        this.state.selected.clear();
        clearStyle(this.style);
    }

    toggle(e) {
        let idx = e2idx(this.state.mapping, e);

        // Selected.
        if (!this.state.selected.has(idx)) {
            this.state.selected.add(idx);
        }

        // Unselected.
        else {
            this.state.selected.delete(idx);
        }

        this.makeCSS();

        // HACK: use an event system here instead
        if (app.unity)
            app.unity.setVisibility();
    }

    count() {
        return this.state.selected.size;
    }

    makeCSS() {
        let mapping = this.state.mapping;

        clearStyle(this.style);
        if (this.state.selected.size > 0) {
            this.style.insertRule(`svg path { fill-opacity: 0.5; }`);
        }
        for (let id of this.state.selected) {
            this.style.insertRule(`svg path.${mapping}_region_${id} { stroke-width: 3px; fill-opacity: 1.0; }`);
            this.style.insertRule(`ul#bar-plot-list > li.${mapping}_region_${id} { background-color: var(--bar-select-color); }`);
        }
    }
};



/*************************************************************************************************/
/* Tooltip                                                                                       */
/*************************************************************************************************/

class Tooltip {
    constructor(state, region, feature) {
        console.assert(state);
        console.assert(region);
        console.assert(feature);

        this.state = state;
        this.region = region;
        this.feature = feature;

        this.info = document.getElementById('region-info');
    }

    async show(e) {
        this.info.style.visibility = 'visible';
        this.setText(e2idx(this.state.mapping, e));
        this.setPosition(e);
    }

    hide() {
        this.info.style.visibility = 'hidden';
    }

    async setText(regionIdx) {
        let info = await this.region.getInfo(regionIdx);
        if (!info) return;
        let name = info['name'];
        let acronym = info['acronym'];
        let value = await this.feature.get(regionIdx);
        let meanDisplay = typeof value == 'string' ? value : displayNumber(value);
        this.info.innerHTML = `<strong>${acronym}, ${name}</strong><br>${meanDisplay}`;
    }

    async setPosition(e) {
        this.info.style.left = `${e.clientX + 10}px`;
        this.info.style.top = `${e.clientY + 10}px`;
        this.info.style.visibility = 'visible';
    }
};
