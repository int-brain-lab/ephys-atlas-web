export { Colorbar };

import { clamp, displayNumber } from "./utils.js";



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

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

        this.cbar = document.querySelector('#bar-scale .colorbar');
        this.featureMin = document.querySelector('#bar-scale .min');
        this.featureMax = document.querySelector('#bar-scale .max');

        this.setupDispatcher();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        this.setColorbar();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.init(); });
        this.dispatcher.on('bucket', (ev) => { this.clear(); });
        this.dispatcher.on('feature', (e) => { this.setColorbar(); this.setFeatureRange(); });
        this.dispatcher.on('cmap', (e) => { this.setColorbar(); });
        this.dispatcher.on('cmapRange', (e) => { this.setColorbar(); });
        this.dispatcher.on('mapping', (e) => { this.setColorbar(); });
        this.dispatcher.on('stat', (e) => { this.setColorbar(); this.setFeatureRange(); });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    clear() {
        this.cbar.innerHTML = '';
        this.featureMin.innerHTML = '';
        this.featureMax.innerHTML = '';
    }

    setFeatureRange() {
        // Display vmin and vmax.
        const state = this.state;
        if (!state.isVolume) {
            let histogram = this.model.getHistogram(state.bucket, state.fname);
            if (histogram) {
                let vmin = histogram['vmin'];
                let vmax = histogram['vmax'];
                this.featureMin.innerHTML = displayNumber(vmin);
                this.featureMax.innerHTML = displayNumber(vmax);
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

    setColorbar() {
        if (!this.state.fname) {
            this.clear();
            return;
        }

        // Get the data.
        let n = 50; // number of colobar items
        let colors = this.model.getColormap(this.state.cmap);
        let cmin = this.state.cmapmin;
        let cmax = this.state.cmapmax;
        let counts = null;

        // Try retrieving the global histogram for the current feature.
        let histogram = this.model.getHistogram(this.state.bucket, this.state.fname);
        if (histogram) {
            console.log("taking the histogram from the features file");
            counts = histogram["counts"];
        }
        else {
            // Compute the histogram.
            console.log("histogram not found in the features file, recomputing it");
            let [values, vmin, vmax] = this.getFeatureValues();
            counts = computeHistogram(n, vmin, vmax, values);
        }

        drawHistogram(this.cbar, counts, cmin, cmax, colors);
    }
};
