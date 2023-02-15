
/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

function getSVG(axis) {
    return document.getElementById(`figure-${axis}`);
};



function getBarPlot() {
    return document.getElementById('bar-plot');
};



function getRegionID(obj) {
    return obj.classList[0].substr(7);
};



function clearStyle(style) {
    let n = style.cssRules.length;

    for (let i = 0; i < n; i++) {
        style.deleteRule(0);
    }
};



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

        for (let id of this.selected) {
            this.style.insertRule(`svg path.region_${id} { stroke-width: 3px; stroke: var(--svg-highlight-color) !important; }`);
            this.style.insertRule(`ul#bar-plot > li.region_${id} { background-color: var(--bar-select-color); }`);
        }
    }
};



/*************************************************************************************************/
/* Setup                                                                                         */
/*************************************************************************************************/

async function highlight(target) {
    let id = getRegionID(target);
    highlighter.highlight(id);

    const dropdown = getFeatureDropdown();
    let feature = dropdown.value;
    let value = await svgdb.getFeature(feature, id);
    if (!value) return;
    let mean = value.mean;
    let meanDisplay = Math.abs(mean) < .001 ? mean.toExponential(5) : mean.toPrecision(5);

    const info = document.getElementById('region-info');
    let name = REGIONS[id];
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
            highlighter.highlight(null);
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
            selector.toggle(id);
        }
    });
}



function setupBarSelection() {
    const bar = getBarPlot();
    bar.addEventListener('click', (e) => {
        if (e.target.tagName == 'LI') {
            let id = getRegionID(e.target);
            selector.toggle(id);
        }
    });
}
