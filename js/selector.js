
/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

function getSVG(axis) {
    return document.getElementById(`figure-${axis}`);
};



function getBarPlot() {
    return document.getElementById("bar-plot");
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
        this.style = document.getElementById("style-highlighter").sheet;
    }

    highlight(id) {
        this.highlighted = id;
        this.makeCSS();
    }

    makeCSS() {
        clearStyle(this.style);

        let id = this.highlighted;

        this.style.insertRule(`svg path.region_${id} { stroke: #000f; filter: brightness(125%); }`);
        this.style.insertRule(`#bar-plot li.region_${id} { background-color: var(--bar-highlight-color); }`);
    }
};



/*************************************************************************************************/
/* Selector                                                                                      */
/*************************************************************************************************/

class Selector {
    constructor() {
        this.selected = new Set();
        this.style = document.getElementById("style-selector").sheet;
    }

    toggle(id) {
        if (!this.selected.has(id))
            this.selected.add(id);
        else
            this.selected.delete(id);
    }

    count() {
        return this.selected.size;
    }

    makeCSS() {
        clearStyle(this.style);

        let opacity = this.count() > 0 ? 0.35 : 1.0;
        this.style.insertRule(`svg path { opacity: ${opacity}; }`);

        for (let id of this.selected) {
            this.style.insertRule(`svg path.region_${id} { opacity: 1; }`);
        }
    }
};



/*************************************************************************************************/
/* Setup                                                                                         */
/*************************************************************************************************/

function setupSVGHighlighting(axis) {
    const svg = getSVG(axis);
    svg.addEventListener('mouseover', (e) => {
        if (e.target.tagName == 'path') {
            let id = getRegionID(e.target);
            highlighter.highlight(id);
        }
    });
};



function setupBarHighlighting() {
    const bar = getBarPlot();
    bar.addEventListener('mousemove', (e) => {
        if (e.target.tagName == 'LI') {
            let id = getRegionID(e.target);
            highlighter.highlight(id);
        }
    });
}
