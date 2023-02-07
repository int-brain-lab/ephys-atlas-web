
/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const DB_NAME = "IBLEphysAtlasDatabase";



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

function throttle(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function () {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
    };
    return function () {
        var now = Date.now();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };
};



/*************************************************************************************************/
/* SVG slices                                                                                    */
/*************************************************************************************************/

async function downloadSlices() {
    console.log("downloading the SVG data...");

    var url = `/data/slices.json`;
    var r = await fetch(url);
    var slices = await r.json();

    console.log("download finished");
    return slices;
}



/*************************************************************************************************/
/* SVG local database                                                                            */
/*************************************************************************************************/

function deleteDatabase() {
    console.log("deleting the database");
    Dexie.delete(DB_NAME);
}



function insertSlices(store, slices, axis) {
    // Put the SVG data in the database.
    store.bulkPut(slices[axis]).then(ev => {
        console.log(`successfully filled the '${axis}' store with the SVG slices`);
    }).catch(err => {
        console.error("error:", err);
    });
}



function getSlice(table, idx) {
    table.get(idx).then((item) => {
        let svg = item["svg"];
        document.getElementById("figure_1").innerHTML = svg;
    });
}

getSlice = throttle(getSlice, 10); // wait at least 10 ms between two successive calls



/*************************************************************************************************/
/* SVG class                                                                                     */
/*************************************************************************************************/

class SVGDB {
    constructor() {
        this.db = new Dexie(DB_NAME);

        this.db.version(1).stores({
            coronal: "idx,svg",
            horizontal: "idx,svg",
            sagittal: "idx,svg",
        });

        let that = this;
        this.db.open().then((ev) => {
            console.log("opening the database");

            that.coronal = this.db.table("coronal");
            that.horizontal = this.db.table("horizontal");
            that.sagittal = this.db.table("sagittal");

            that.coronal.count().then((res) => {
                if (res == 0) {
                    console.log("database seems to be empty, downloading the SVG slices...");

                    // Download the SVG slices.
                    downloadSlices().then((slices) => {

                        // Put the SVG data in the database.
                        insertSlices(that.coronal, slices, "coronal");
                        insertSlices(that.horizontal, slices, "horizontal");
                        insertSlices(that.sagittal, slices, "sagittal");

                        console.log("successfully loaded stores");
                    });
                }
            });
        }).catch((err) => {
            console.error('failed to open db:', (err.stack || err));
        });
    }

    getSlice(axis, idx) {
        return getSlice(this[axis], idx);
    }
}



/*************************************************************************************************/
/* Highlighting                                                                                  */
/*************************************************************************************************/

function getSVG() {
    return document.getElementById("figure_1");
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

function getBar(barplot, region) {
    return barplot.getElementsByClassName(region)[0];
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
        bar.addEventListener('mouseover', (e) => {
            if (e.target.tagName == 'LI') {
                highlight(bar, true);

                let path = getPath(svg, e.target.classList[0]);
                highlight(path, true);
            }
        });

        bar.addEventListener('mouseout', (e) => {
            if (e.target.tagName == 'LI') {
                highlight(bar, false);

                let path = getPath(svg, e.target.classList[0]);
                highlight(path, false);
            }
        });
    }
}



/*************************************************************************************************/
/* Slider                                                                                        */
/*************************************************************************************************/

function getSlider() {
    return document.getElementById("slice-range");
}

function setSlice(svgdb, slider) {
    let idx = Math.floor(slider.value);
    svgdb.getSlice("coronal", idx);
}

function setupSlider(svgdb, svg) {
    let slider = getSlider();

    slider.oninput = (ev) => {
        setSlice(svgdb, ev.target);
    };

    svg.addEventListener('wheel', function (ev) {
        let x = ev.deltaY;
        if (x == 0) return;
        else if (x < 0)
            slider.valueAsNumber += 10;
        else if (x > 0)
            slider.valueAsNumber -= 10;

        setSlice(svgdb, slider);
    });
}



/*************************************************************************************************/
/* Entry-point                                                                                   */
/*************************************************************************************************/

window.onload = async (evl) => {
    console.log("page loaded");
    // deleteDatabase();

    let svgdb = new SVGDB();

    let svg = getSVG();
    let barPlot = getBarPlot();

    // Setup slicing.
    setupSlider(svgdb, svg)

    // Setup highlighting.
    setupHighlightRegions(svg, barPlot);
    setupHighlightBars(svg, barPlot);
};
