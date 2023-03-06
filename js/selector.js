
/*************************************************************************************************/
/* Highlighter                                                                                   */
/*************************************************************************************************/

class Highlighter {
    constructor() {
        this.highlighted = null;
        this.style = document.getElementById('style-highlighter').sheet;
    }

    highlight(id) {
        this.highlighted = id;
        this.makeCSS();
    }

    makeCSS() {
        clearStyle(this.style);

        let id = this.highlighted;

        this.style.insertRule(`svg path.region_${id} { stroke: #000f; fill: var(--main-accent-color); }`);
        this.style.insertRule(`#bar-plot li.region_${id} { background-color: var(--bar-highlight-color); }`);
    }
};



/*************************************************************************************************/
/* Selector                                                                                      */
/*************************************************************************************************/

class Selector {
    constructor() {
        this.selected = new Set();
        this.style = document.getElementById('style-selector').sheet;
    }

    toggle(id) {
        if (!this.selected.has(id))
            this.selected.add(id);
        else
            this.selected.delete(id);
        this.makeCSS();
    }

    count() {
        return this.selected.size;
    }

    makeCSS() {
        clearStyle(this.style);
        if (this.selected.size > 0) {
            this.style.insertRule(`svg path { fill-opacity: 0.5; }`);
        }
        for (let id of this.selected) {
            this.style.insertRule(`svg path.region_${id} { stroke-width: 3px; fill-opacity: 1.0; }`);
            this.style.insertRule(`ul#bar-plot > li.region_${id} { background-color: var(--bar-select-color); }`);
        }
    }
};



/*************************************************************************************************/
/* Setup                                                                                         */
/*************************************************************************************************/

async function highlight(target) {
    let id = getRegionID(target);

    // Highlight the region.
    HIGHLIGHTER.highlight(id);

    // Get the current value.
    let value = await FEATURE.get(id);
    if (!value) return;

    // Update the region info bar.
    const info = document.getElementById('region-info');
    let name = REGIONS[id];
    let meanDisplay = displayNumber(value);
    info.innerHTML = `<strong>${name}</strong>: ${meanDisplay}`;
}



function setupSVGHighlighting(axis) {
    const svg = getSVG(axis);

    svg.addEventListener('mouseover', (e) => {
        if (e.target.tagName == 'path') {
            highlight(e.target);
        }
    });

    svg.addEventListener('mouseout', (e) => {
        if (e.target.tagName == 'path') {
            HIGHLIGHTER.highlight(null);
        }
    });
};



function setupBarHighlighting() {
    const bar = getBarPlot();
    bar.addEventListener('mousemove', throttle((e) => {
        if (e.target.tagName == 'LI') {
            highlight(e.target);
        }
    }, 50));
}



function setupSVGSelection(axis) {
    const svg = getSVG(axis);
    svg.addEventListener('click', (e) => {
        if (e.target.tagName == 'path') {
            let id = getRegionID(e.target);
            SELECTOR.toggle(id);
        }
    });
}



function setupBarSelection() {
    const bar = getBarPlot();
    bar.addEventListener('click', (e) => {
        if (e.target.tagName == 'LI') {
            let id = getRegionID(e.target);
            SELECTOR.toggle(id);
        }
    });
}
