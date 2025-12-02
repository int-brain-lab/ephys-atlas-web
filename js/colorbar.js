export { Colorbar };

import { clamp, displayNumber } from "./utils.js";



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

const BIN_COUNT = 50;


function computeHistogram(n, cmin, cmax, values) {
    console.log(`compute histogram for ${values.length} values`);

    // Initialize an array to store the histogram bins
    const histogram = new Array(n).fill(0);

    // Calculate the bin width
    const binWidth = (cmax - cmin) / n;

    // Iterate through each value and increment the corresponding bin
    values.forEach(value => {
        // Skip values outside the specified range
        if (value < cmin || value >= cmax) {
            return;
        }

        // Determine the bin index for the current value
        const binIndex = Math.floor((value - cmin) / binWidth);

        // Increment the corresponding bin
        histogram[binIndex]++;
    });

    return histogram;
}


function drawHistogram(container, counts, cmin, cmax, cmap, denominator) {
    if (!container) return;
    if (!counts) return;
    console.assert(cmap);

    // container: div
    // counts: values of the histogram
    // cmin: minimal colormap value, from 0 to 100
    // cmax: maximal colormap value
    // colorCount: number of colors in the colormap
    let n = counts.length;
    let colorCount = cmap.length;
    const safeDenominator = denominator > 0 ? denominator : Math.max(1, ...counts);

    // Generate the histogram DOM elements.
    let child = null;
    if (container.children.length == 0) {
        for (let i = 0; i < n; i++) {
            child = document.createElement('div');
            child.classList.add(`bar-${i}`);
            container.appendChild(child);
        }
    }

    let x = 0;
    for (let i = 0; i < n; i++) {
        child = container.children[i];
        x = i * 100.0 / n;
        x = (x - cmin) / (cmax - cmin);
        x = clamp(x, 0, .9999);
        child.style.backgroundColor = cmap[Math.floor(x * colorCount)];

        // Histogram height.
        child.style.height = `calc(10px + ${counts[i] * 100.0 / safeDenominator}%)`;
    }
}


// Add the histograms of all selected regions.
function getFeatureHistogram(features, selected, n_bins) {
    if (!selected) return;

    let histogram = new Array(n_bins).fill(0);
    let selectedCount = 0;

    selected.forEach(regionIdx => {
        let f = features["data"][regionIdx];
        if (!f) return;
        selectedCount += f["count"];

        Object.keys(f).forEach(key => {
            let match = key.match(/^h_(\d+)$/);
            if (match) {
                let index = parseInt(match[1], 10);
                if (index >= 0 && index < n_bins) {
                    histogram[index] += f[key];
                }
            }
        });
    });

    return [histogram, selectedCount];
}




/*************************************************************************************************/
/* Histogram component                                                                           */
/*************************************************************************************************/

class Histogram {
    constructor(parentDiv, state, model) {
        console.assert(parentDiv);

        this.state = state;
        this.model = model;

        this.cmap = null;
        this.cmin = null;
        this.cmax = null;

        // Clear all children of the parentDiv
        parentDiv.innerHTML = "";

        // === Create colorbar wrapper ===
        const colorbarWrapper = document.createElement("div");
        colorbarWrapper.className = "colorbar-wrapper";

        this.cbar = document.createElement("div");
        this.cbar.className = "colorbar";
        colorbarWrapper.appendChild(this.cbar);

        this.cbar2 = document.createElement("div");
        this.cbar2.className = "colorbar";
        colorbarWrapper.appendChild(this.cbar2);

        parentDiv.appendChild(colorbarWrapper);

        // === Separator ===
        const hr = document.createElement("hr");
        parentDiv.appendChild(hr);

        // === Min/Max wrapper ===
        const rangeWrapper = document.createElement("div");
        rangeWrapper.className = "wrapper";

        this.featureMin = document.createElement("div");
        this.featureMin.className = "min";
        rangeWrapper.appendChild(this.featureMin);

        this.featureMax = document.createElement("div");
        this.featureMax.className = "max";
        rangeWrapper.appendChild(this.featureMax);

        parentDiv.appendChild(rangeWrapper);

        // === Mini stats ===
        const miniStats = document.createElement("div");
        miniStats.className = "mini-stats";

        this.countTotal = document.createElement("div");
        this.countTotal.className = "count-total";
        miniStats.appendChild(this.countTotal);

        this.countSelected = document.createElement("div");
        this.countSelected.className = "count-selected";
        miniStats.appendChild(this.countSelected);

        parentDiv.appendChild(miniStats);

        // Initialize bars
        this.clear();
    }

    clear() {
        this.cbar.innerHTML = '';
        this.featureMin.innerHTML = '';
        this.featureMax.innerHTML = '';
        this.countTotal.innerHTML = '';

        this.clearLocal();
    }

    clearLocal() {
        this.cbar2.style.opacity = 0;
        this.countSelected.innerHTML = '';
    }

    setFeatureRange(vmin, vmax) {
        this.featureMin.innerHTML = displayNumber(vmin);
        this.featureMax.innerHTML = displayNumber(vmax);
    }

    setGlobalCount(count) {
        this.countTotal.innerHTML = count > 0 ? `n<sub>total</sub>=${count.toLocaleString()}` : '';
    }

    setLocalCount(count) {
        this.countSelected.innerHTML = count > 0 ? `n<sub>selected</sub>=${count.toLocaleString()}` : "";
    }

    setColormap(cmap, cmapmin, cmapmax) {
        this.cmap = cmap;
        this.cmapmin = cmapmin;
        this.cmapmax = cmapmax;
    }

    setGlobalHistogram(counts, denominator) {
        drawHistogram(this.cbar, counts, this.cmapmin, this.cmapmax, this.cmap, denominator);
    }

    setLocalHistogram(counts, denominator) {
        this.cbar2.style.opacity = 1;
        drawHistogram(this.cbar2, counts, this.cmapmin, this.cmapmax, this.cmap, denominator);
    }
}



/*************************************************************************************************/
/* Colorbar                                                                                      */
/*************************************************************************************************/

class Colorbar {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.miniHistogram = new Histogram(document.getElementById("mini-histogram"), state, model);

        this.setupDispatcher();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        this.setGlobalHistogram();
        this.setLocalHistogram();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.init(); });
        this.dispatcher.on('bucket', (ev) => { this.clear(); });
        this.dispatcher.on('feature', (e) => {
            this.setColormap();
            this.setGlobalHistogram();
            this.setLocalHistogram();
        });
        this.dispatcher.on('cmap', (e) => {
            this.setColormap();
            this.setGlobalHistogram();
            this.setLocalHistogram();
        });
        this.dispatcher.on('cmapRange', (e) => {
            this.setColormap();
            this.setGlobalHistogram();
            this.setLocalHistogram();
        });
        this.dispatcher.on('mapping', (e) => {
            this.setGlobalHistogram();
            this.setLocalHistogram();
        });
        this.dispatcher.on('stat', (e) => {
            this.setGlobalHistogram();
        });
        this.dispatcher.on('toggle', (e) => {
            this.setLocalHistogram();
        });
        this.dispatcher.on('clear', (e) => {
            this.setLocalHistogram();
        });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    getFeatureValues() {
        // Load the region and features data.
        let regions = this.model.getRegions(this.state.mapping);
        let features = this.state.isVolume ? null : this.model.getFeatures(
            this.state.bucket, this.state.fname, this.state.mapping);
        let vmin = +10e100, vmax = -10e100;

        // Go through all regions.
        let values = [];
        for (let regionIdx in regions) {
            let region = regions[regionIdx];
            console.assert(region);
            let value = features ? features['data'][regionIdx] : null;
            if (!value) {
                continue;
            }
            value = value[this.state.stat];
            values.push(value);
            vmin = value < vmin ? value : vmin;
            vmax = value > vmax ? value : vmax;
        }
        return [values, vmin, vmax];
    }

    getGlobalHistogram() {
        if (!this.state.fname) {
            this.clear();
            return;
        }

        if (this.state.isVolume) {
            const volume = this.model.getFeatures(this.state.bucket, this.state.fname);
            if (volume) {
                console.log(volume);
                let vmin = volume["mean"]['bounds'][0];
                let vmax = volume["mean"]['bounds'][1];
                let values = volume["mean"]['volume']["data"];
                return computeHistogram(BIN_COUNT, vmin, vmax, values);
            }
        }

        let counts = null;

        // Try retrieving the global histogram for the current feature.
        let histogram = this.model.getHistogram(this.state.bucket, this.state.fname);
        if (histogram) {
            console.log("taking the histogram from the features file");
            counts = histogram["counts"];
        }
        else {
            // Compute the histogram across all regions (1 value per region).
            console.log("histogram not found in the features file, recomputing it");
            let [values, vmin, vmax] = this.getFeatureValues();
            counts = computeHistogram(BIN_COUNT, vmin, vmax, values);
        }
        return counts;
    }

    /* Public functions                                                                          */
    /*********************************************************************************************/

    clear(hist) {
        hist = hist || this.miniHistogram;
        hist.clear();
    }

    setFeatureRange(hist) {
        hist = hist || this.miniHistogram;
        // Display vmin and vmax.
        const state = this.state;
        if (!state.isVolume) {
            let histogram = this.model.getHistogram(state.bucket, state.fname);
            if (histogram) {
                let vmin = histogram['vmin'];
                let vmax = histogram['vmax'];
                let count = histogram['total_count'];
                hist.setFeatureRange(vmin, vmax);
                hist.setGlobalCount(count);
            }
        } else {
            const volume = this.model.getFeatures(state.bucket, state.fname);
            if (volume) {
                let vmin = volume["mean"]['bounds'][0];
                let vmax = volume["mean"]['bounds'][1];
                hist.setFeatureRange(vmin, vmax, 0);
            }
        }
    }

    setColormap(hist) {
        hist = hist || this.miniHistogram;
        let cmap = this.model.getColormap(this.state.cmap);
        hist.setColormap(cmap, this.state.cmapmin, this.state.cmapmax);
    }

    setGlobalHistogram(hist) {
        console.log("set global histogram");
        hist = hist || this.miniHistogram;
        this.setFeatureRange();
        let counts = this.getGlobalHistogram();
        if (!counts || !counts.length) return;
        const countMax = Math.max(...counts);
        hist.setGlobalHistogram(counts, countMax);
    }

    setLocalHistogram(hist, selected) {
        hist = hist || this.miniHistogram;
        const selection = selected || this.state.selected;
        if (!selection || selection.size == 0) {
            hist.clearLocal();
            return;
        }
        else {
            selected = selection;

            // Load the region and features data.
            let features = this.state.isVolume ? null : this.model.getFeatures(
                this.state.bucket, this.state.fname, this.state.mapping);

            if (!features) {
                hist.clearLocal();
                return;
            }

            // Now, draw the cumulated histogram of the selected region(s), if any.
            let [counts, selectedCount] = getFeatureHistogram(features, selected, BIN_COUNT);

            hist.setLocalCount(selectedCount);
            const countMax = Math.max(...counts);
            hist.setLocalHistogram(counts, countMax);
        }
    }
};
