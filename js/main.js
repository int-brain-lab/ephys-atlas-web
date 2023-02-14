
/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const DB_NAME = "IBLEphysAtlasDatabase";
const DB_VERSION = 1;



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



function getOS() {
    var userAgent = window.navigator.userAgent,
        platform = window.navigator?.userAgentData?.platform || window.navigator.platform,
        macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
        windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
        iosPlatforms = ['iPhone', 'iPad', 'iPod'],
        os = null;

    if (macosPlatforms.indexOf(platform) !== -1) {
        os = 'macOS';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
        os = 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
        os = 'Windows';
    } else if (/Android/.test(userAgent)) {
        os = 'Android';
    } else if (/Linux/.test(platform)) {
        os = 'Linux';
    }

    return os;
}



async function downloadJSON(url) {
    console.log(`downloading ${url}...`);
    var r = await fetch(url);
    var out = await r.json();
    console.log("download finished");
    return out;
}



/*************************************************************************************************/
/* SVG slices                                                                                    */
/*************************************************************************************************/

async function downloadSlices() {
    return downloadJSON(`/data/slices.json`);
}



/*************************************************************************************************/
/* Features                                                                                      */
/*************************************************************************************************/

async function downloadFeatures() {
    return downloadJSON(`/data/features.json`);
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
        if (item) {
            let svg = item["svg"];
            document.getElementById("figure_1").innerHTML = svg;
        }
    });
}

getSlice = throttle(getSlice, 10); // wait at least 10 ms between two successive calls



/*************************************************************************************************/
/* SVG class                                                                                     */
/*************************************************************************************************/

class SVGDB {
    constructor() {
        this.db = new Dexie(DB_NAME);

        this.db.version(DB_VERSION).stores({
            coronal: "idx,svg",
            horizontal: "idx,svg",
            sagittal: "idx,svg",
            extra: "idx,svg",
            features: "feature,data,statistics",
        });

        let that = this;
        this.db.open().then((ev) => {
            console.log("opening the database");

            that.coronal = this.db.table("coronal");
            that.horizontal = this.db.table("horizontal");
            that.sagittal = this.db.table("sagittal");
            that.extra = this.db.table("extra");
            that.features = this.db.table("features");


            // Fill the database with the SVG data.
            that.coronal.count().then(async (res) => {
                if (res == 0) {
                    console.log("filling the database with the SVG data...");

                    // Download the SVG slices.
                    let slices = await downloadSlices();

                    // Put the SVG data in the database.
                    insertSlices(that.coronal, slices, "coronal");
                    insertSlices(that.horizontal, slices, "horizontal");
                    insertSlices(that.sagittal, slices, "sagittal");

                    // Extra
                    let extra = [
                        { "idx": "top", "svg": slices["top"] },
                        { "idx": "swanson", "svg": slices["swanson"] },
                    ];
                    that.extra.bulkPut(extra).then(ev => {
                        console.log(`successfully filled the extra store with the SVG data`);
                    }).catch(err => {
                        console.error("error:", err);
                    });

                    console.log("successfully loaded slides");

                }
            }).catch((err) => {
                console.error('failed to open db:', (err.stack || err));
            });


            // Fill the database with the features data.
            that.features.count().then((res) => {
                if (res == 0) {
                    console.log("filling the database with the features...");

                    downloadFeatures().then((features) => {
                        // Put the feature data in the database.
                        that.features.bulkPut(features).then(ev => {
                            console.log(`successfully filled the features store`);
                        }).catch(err => {
                            console.error("error:", err);
                        });
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

    getTop() {
        this.extra.get("top").then((item) => {
            if (item) {
                let svg = item["svg"];
                document.getElementById("figure_1").innerHTML = svg;
            }
        });
    }

    getSwanson() {
        this.extra.get("swanson").then((item) => {
            if (item) {
                let svg = item["svg"];
                document.getElementById("figure_1").innerHTML = svg;
            }
        });
    }

    async getFeature(feature, region_idx) {
        let item = await this.features.get(feature);
        return item["data"][region_idx];
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




/*************************************************************************************************/
/* Region selection                                                                              */
/*************************************************************************************************/

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
        style.insertRule(`#svg1 path { opacity: ${opacity}; }`);

        for (let id of this.selected) {
            style.insertRule(`#svg1 path.region_${id} { opacity: 1; }`);
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
        slider.valueAsNumber = Math.min(1319, Math.max(0, slider.valueAsNumber));

        setSlice(svgdb, slider);
    }, { passive: false });
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
    // NOTE: parent's parent is SVG's container div.
    setupSlider(svgdb, svg.parentNode.parentNode);

    // Setup highlighting.
    setupHighlightRegions(svg, barPlot);
    setupHighlightBars(svg, barPlot);

    // Setup selection.
    setupSelectRegions(svg, barPlot);
};
