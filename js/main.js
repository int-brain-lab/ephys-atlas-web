
/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

// function throttle(func, wait, options) {
//     var context, args, result;
//     var timeout = null;
//     var previous = 0;
//     if (!options) options = {};
//     var later = function () {
//         previous = options.leading === false ? 0 : Date.now();
//         timeout = null;
//         result = func.apply(context, args);
//         if (!timeout) context = args = null;
//     };
//     return function () {
//         var now = Date.now();
//         if (!previous && options.leading === false) previous = now;
//         var remaining = wait - (now - previous);
//         context = this;
//         args = arguments;
//         if (remaining <= 0 || remaining > wait) {
//             if (timeout) {
//                 clearTimeout(timeout);
//                 timeout = null;
//             }
//             previous = now;
//             result = func.apply(context, args);
//             if (!timeout) context = args = null;
//         } else if (!timeout && options.trailing !== false) {
//             timeout = setTimeout(later, remaining);
//         }
//         return result;
//     };
// };





/*************************************************************************************************/
/* Highlighting                                                                                  */
/*************************************************************************************************/
/*
function getSVG(axis) {
    return document.getElementById(`figure-${axis}`);
}

function getPaths(svg) {
    return svg.getElementsByTagName('path');
}

function getPath(svg, region) {
    return svg.getElementsByClassName(region)[0];
}

function highlight(obj, highlighted) {
    if (obj) {
        if (highlighted)
            obj.classList.add("hover");
        else
            obj.classList.remove("hover");
    }
}



function getBarPlot() {
    return document.getElementById("bar-plot");
}

function getBars(barPlot) {
    return barPlot.getElementsByTagName('li');
}

function getBar(barPlot, region) {
    return barPlot.getElementsByClassName(region)[0];
}

function clearBars(bars) {
    for (let bar of bars) {
        bar.classList.remove("hover");
    }
}



function setupHighlightRegions(svg, barPlot) {
    // SVG ==> bars
    svg.addEventListener('mouseover', (e) => {
        if (e.target.tagName == 'path') {
            highlight(e.target, true);

            let bar = getBar(barPlot, e.target.classList[0]);
            highlight(bar, true);
        }
    });
    svg.addEventListener('mouseout', (e) => {
        if (e.target.tagName == 'path') {
            highlight(e.target, false);

            let bar = getBar(barPlot, e.target.classList[0]);
            highlight(bar, false);
        }
    });

}



function setupHighlightBars(svg, barPlot) {
    // Bars ==> SVG
    let bars = getBars(barPlot);
    for (let bar of bars) {
        bar.addEventListener('mouseenter', (e) => {
            if (e.target.tagName == 'LI') {
                highlight(bar, true);

                let path = getPath(svg, e.target.classList[0]);
                highlight(path, true);
            }
        });

        bar.addEventListener('mouseleave', (e) => {
            if (e.target.tagName == 'LI') {
                highlight(bar, false);

                let path = getPath(svg, e.target.classList[0]);
                highlight(path, false);
            }
        });
    }
}
*/



/*************************************************************************************************/
/* Region selection                                                                              */
/*************************************************************************************************/
/*
function getStyle() {
    let style = document.getElementById("style").sheet;
    return style;
}



class RegionSelector {
    constructor() {
        this.selected = new Set();
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
        let style = getStyle();

        // Clear the CSS.
        let n = style.cssRules.length;
        for (let i = 0; i < n; i++) {
            style.deleteRule(0);
        }

        let opacity = this.count() > 0 ? 0.35 : 1.0;
        style.insertRule(`svg path { opacity: ${opacity}; }`);

        for (let id of this.selected) {
            style.insertRule(`svg path.region_${id} { opacity: 1; }`);
        }
    }
}



function setupSelectRegions(svg, barPlot) {
    let rs = new RegionSelector();

    // Click to select a region.
    svg.addEventListener('click', (e) => {
        if (e.target.tagName == 'path') {
            let cls = e.target.classList[0];
            let id = cls.substr(7);

            rs.toggle(id);
            rs.makeCSS();
        }
    });
}
*/


/*************************************************************************************************/
/* Slider                                                                                        */
/*************************************************************************************************/
/*
function getSlider(axis) {
    return document.getElementById(`slider-${axis}`);
}

function setSlice(axis, svgdb, slider) {
    let idx = Math.floor(slider.value);
    svgdb.getSlice(axis, idx);
}

function setupSlider(axis, svgdb, svg) {
    if (axis == "top") return;
    if (axis == "swanson") return;

    let slider = getSlider(axis);
    let MAX = 0;
    if (axis == "coronal") MAX = 1319;
    if (axis == "horizontal") MAX = 799;
    if (axis == "sagittal") MAX = 1139;

    slider.oninput = (ev) => {
        setSlice(axis, svgdb, ev.target);
    };

    let bars = getBars(getBarPlot());

    svg.addEventListener('wheel', function (ev) {
        ev.preventDefault();
        let x = ev.deltaY;

        // HACK: handle scrolling with touchpad on mac
        let k = getOS() == "macOS" ? 4 : 24;

        if (x == 0) return;
        else if (x < 0)
            slider.valueAsNumber += k;
        else if (x > 0)
            slider.valueAsNumber -= k;

        clearBars(bars);

        // Clipping.
        slider.valueAsNumber = Math.min(MAX, Math.max(0, slider.valueAsNumber));

        setSlice(axis, svgdb, slider);
    }, { passive: false });
}
*/


/*************************************************************************************************/
/* Entry-point                                                                                   */
/*************************************************************************************************/
/*
function setupSVG(svgdb, barPlot, axis) {
    let svg = getSVG(axis);

    // Setup slicing.
    // NOTE: parent's parent is SVG's container div.
    setupSlider(axis, svgdb, svg.parentNode.parentNode);

    // Setup highlighting.
    setupHighlightRegions(svg, barPlot);
    setupHighlightBars(svg, barPlot);

    // Setup selection.
    setupSelectRegions(svg, barPlot);
}
*/
// window.onload = async (evl) => {
// console.log("page loaded");
// deleteDatabase();

// let svgdb = new SVGDB();
// let barPlot = getBarPlot();

// setupSVG(svgdb, barPlot, "coronal");
// setupSVG(svgdb, barPlot, "sagittal");
// setupSVG(svgdb, barPlot, "horizontal");
// setupSVG(svgdb, barPlot, "top");
// setupSVG(svgdb, barPlot, "swanson");
// };




const svgdb = new SVGDB();
const highlighter = new Highlighter();
const selector = new Selector();

setupSVGHighlighting('coronal');
setupSVGHighlighting('sagittal');
setupSVGHighlighting('horizontal');
setupSVGHighlighting('top');
setupSVGHighlighting('swanson');

setupSVGSelection('coronal');
setupSVGSelection('sagittal');
setupSVGSelection('horizontal');
setupSVGSelection('top');
setupSVGSelection('swanson');

setupBarHighlighting();
setupBarSelection();

setupSlider('coronal');
setupSlider('sagittal');
setupSlider('horizontal');
