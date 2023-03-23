export { Highlighter, Selector, Tooltip };

import { e2idx, clearStyle, displayNumber } from "./utils.js";



/*************************************************************************************************/
/* Highlighter                                                                                   */
/*************************************************************************************************/

class Highlighter {
    constructor(state) {
        console.assert(state);
        this.state = state;
        this.highlighted = null;
        this.style = document.getElementById('style-highlighter').sheet;
    }

    highlight(e) {
        this.highlighted = e2idx(this.state.mapping, e);
        this.makeCSS();
    }

    clear() {
        this.highlighted = null;
        clearStyle(this.style);
    }

    makeCSS() {
        clearStyle(this.style);

        let idx = this.highlighted;
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
        this.selected = new Set();
        this.style = document.getElementById('style-selector').sheet;
    }

    toggle(e) {
        let idx = e2idx(this.state.mapping, e);
        if (!this.selected.has(idx))
            this.selected.add(idx);
        else
            this.selected.delete(idx);
        this.makeCSS();
    }

    count() {
        return this.selected.size;
    }

    makeCSS() {
        let mapping = this.state.mapping;

        clearStyle(this.style);
        if (this.selected.size > 0) {
            this.style.insertRule(`svg path { fill-opacity: 0.5; }`);
        }
        for (let id of this.selected) {
            this.style.insertRule(`svg path.${mapping}_region_${id} { stroke-width: 3px; fill-opacity: 1.0; }`);
            this.style.insertRule(`ul#bar-plot > li.${mapping}_region_${id} { background-color: var(--bar-select-color); }`);
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

    async setText(region_idx) {
        let name = await this.region.getName(region_idx);
        let value = await this.feature.get(region_idx);
        let meanDisplay = displayNumber(value);
        this.info.innerHTML = `<strong>${name}</strong>: ${meanDisplay}`;
    }

    async setPosition(e) {
        this.info.style.left = `${e.clientX + 10}px`;
        this.info.style.top = `${e.clientY + 10}px`;
        this.info.style.visibility = 'visible';
    }
};
