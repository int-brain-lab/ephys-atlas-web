export { Colorbar };

import { clamp, displayNumber } from "./utils.js";



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

const BIN_COUNT = 50;


function computeHistogram(n, cmin, cmax, values) {
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


function drawHistogram(container, counts, cmin, cmax, colors) {
    if (!container) return;
    if (!counts) return;

    // container: div
    // counts: values of the histogram
    // cmin: minimal colormap value, from 0 to 100
    // cmax: maximal colormap value
    // colorCount: number of colors in the colormap
    let n = counts.length;
    let countMax = Math.max(...counts);
    let colorCount = colors.length;

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
        child.style.backgroundColor = colors[Math.floor(x * colorCount)];

        // Histogram height.
        child.style.height = `calc(10px + ${counts[i] * 100.0 / countMax}%)`;
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

        this.cbar = document.querySelectorAll('#bar-scale .colorbar')[0];
        this.cbar2 = document.querySelectorAll('#bar-scale .colorbar')[1];
        this.statToolbox = document.getElementById('stat-toolbox');

        this.featureMin = document.querySelector('#bar-scale .min');
        this.featureMax = document.querySelector('#bar-scale .max');

        this.countTotal = document.querySelector('#bar-scale .count-total');
        this.countSelected = document.querySelector('#bar-scale .count-selected');

        this.setupDispatcher();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        this.setColorbar();
        this.setColorbarSelected();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.init(); });
        this.dispatcher.on('bucket', (ev) => { this.clear(); });
        this.dispatcher.on('feature', (e) => {
            this.setColorbar(); this.setColorbarSelected(); this.setFeatureRange();
        });
        this.dispatcher.on('cmap', (e) => { this.setColorbar(); this.setColorbarSelected(); });
        this.dispatcher.on('cmapRange', (e) => { this.setColorbar(); this.setColorbarSelected(); });
        this.dispatcher.on('mapping', (e) => { this.setColorbar(); this.setColorbarSelected(); });
        this.dispatcher.on('stat', (e) => { this.setColorbar(); this.setFeatureRange(); });

        this.dispatcher.on('toggle', (e) => { this.setColorbarSelected(); });
        this.dispatcher.on('toggleStatToolbox', (e) => { this.toggleStatToolbox(); });
        this.dispatcher.on('clear', (e) => { this.setColorbarSelected(); });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    clear() {
        this.cbar.innerHTML = '';
        this.featureMin.innerHTML = '';
        this.featureMax.innerHTML = '';
        this.countTotal.innerHTML = '';
        this.countSelected.innerHTML = '';
    }

    setFeatureRange() {
        // Display vmin and vmax.
        const state = this.state;
        if (!state.isVolume) {
            let histogram = this.model.getHistogram(state.bucket, state.fname);
            if (histogram) {
                let vmin = histogram['vmin'];
                let vmax = histogram['vmax'];
                let count = histogram['total_count'];

                this.featureMin.innerHTML = displayNumber(vmin);
                this.featureMax.innerHTML = displayNumber(vmax);

                this.countTotal.innerHTML = `n<sub>total</sub>=${count.toLocaleString()}`;
                // this.countSelected.innerHTML = ;
            }
        } else {
            const volume = this.model.getFeatures(state.bucket, state.fname);
            if (volume) {
                let vmin = volume['bounds'][0];
                let vmax = volume['bounds'][1];
                this.featureMin.innerHTML = displayNumber(vmin);
                this.featureMax.innerHTML = displayNumber(vmax);
            }
        }
    }

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

    // Intra-region histogram, found in the feature file.
    getFeatureHistogram(n) {
        let selected = this.state.selected;
        if (!selected) return;

        // Load the region and features data.
        // let regions = this.model.getRegions(this.state.mapping);
        let features = this.state.isVolume ? null : this.model.getFeatures(
            this.state.bucket, this.state.fname, this.state.mapping);

        let histogram = new Array(n).fill(0);
        let selectedCount = 0;

        // NOTE: only take the first selected region for now.
        selected.forEach(regionIdx => {
            let f = features["data"][regionIdx];
            if (!f) return;
            selectedCount += f["count"];

            Object.keys(f).forEach(key => {
                let match = key.match(/^h_(\d+)$/);
                if (match) {
                    let index = parseInt(match[1], 10);
                    if (index >= 0 && index < n) {
                        histogram[index] += f[key];
                    }
                }
            });
        });

        return [histogram, selectedCount];
    }

    drawHistogram(container, counts) {
        let colors = this.model.getColormap(this.state.cmap);
        drawHistogram(container, counts, this.state.cmapmin, this.state.cmapmax, colors);
    }

    setColorbar() {
        if (!this.state.fname) {
            this.clear();
            return;
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

        // Draw the global histogram.
        this.drawHistogram(this.cbar, counts);
    }

    setColorbarSelected() {
        if (this.state.selected.size == 0) {
            this.cbar2.style.opacity = 0;
            this.countSelected.innerHTML = '';
        }
        else {
            this.cbar2.style.opacity = 1;
            // Now, draw the histogram of the selected region(s), if any.
            let [counts2, selectedCount] = this.getFeatureHistogram(BIN_COUNT);
            this.drawHistogram(this.cbar2, counts2);

            this.countSelected.innerHTML = `n<sub>selected</sub>=${selectedCount.toLocaleString()}`;
        }
    }

    toggleStatToolbox() {
        console.log("toggle stat toolbox");
        this.statToolbox.classList.toggle("visible");
    }
};
