export { Colorbar };

import { clamp, displayNumber } from "./utils.js";



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

const BIN_COUNT = 50;
const MAX_SELECTED = 5;
const COLORS = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00'];


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
    denominator = denominator > 0 ? denominator : Math.max(...counts);

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
        child.style.height = `calc(10px + ${counts[i] * 100.0 / denominator}%)`;
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


function getNiceTicks(maxValue, tickCount) {
    const niceSteps = [1, 2, 5, 10];
    const exponent = Math.floor(Math.log10(maxValue));
    const base = Math.pow(10, exponent);
    let step = base;

    for (let factor of niceSteps) {
        const s = base * factor;
        if (maxValue / s <= tickCount) {
            step = s;
            break;
        }
    }

    const ticks = [];
    for (let i = 0; i * step <= maxValue; i++) {
        ticks.push(i * step);
    }
    return ticks;
}


function updateStatToolbox(features, regions, selected, maxY = 0) {
    const canvas = document.getElementById('histogram-chart');
    const ctx = canvas.getContext('2d');
    const table = document.getElementById('stat-table');

    // Clear if empty selection
    if (!selected || selected.size === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        table.innerHTML = '';
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    table.innerHTML = '';

    const data = [];
    const allKeys = new Set();

    Array.from(selected).slice(0, MAX_SELECTED).forEach((value, index) => {
        const s = new Set([value]);
        const [countsToolbox, selectedCountToolbox] = getFeatureHistogram(features, s, 50);
        data.push({ id: value, counts: countsToolbox });

        Object.keys(features["data"][value]).forEach(k => {
            if (!k.startsWith('h_')) allKeys.add(k);
        });
    });

    // === Draw chart ===
    const W = canvas.width, H = canvas.height;
    const PAD_LEFT = 30, PAD_BOTTOM = 20, PAD_TOP = 10, PAD_RIGHT = 10;
    const chartWidth = W - PAD_LEFT - PAD_RIGHT;
    const chartHeight = H - PAD_TOP - PAD_BOTTOM;

    const global = maxY > 0;
    maxY = maxY > 0 ? maxY : Math.max(...data.flatMap(d => d.counts));
    const binWidth = chartWidth / 50;

    // Axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, PAD_TOP);
    ctx.lineTo(PAD_LEFT, H - PAD_BOTTOM);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, H - PAD_BOTTOM);
    ctx.lineTo(W - PAD_RIGHT, H - PAD_BOTTOM);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = '#000';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Y-axis ticks using nice numbers
    const yTicks = getNiceTicks(maxY, 5);

    yTicks.forEach(yVal => {
        const yPos = H - PAD_BOTTOM - (yVal / maxY) * chartHeight;
        ctx.fillText(yVal.toString(), PAD_LEFT - 5, yPos);
    });

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
        const xVal = Math.round((50 / xTicks) * i);
        const xPos = PAD_LEFT + (i / xTicks) * chartWidth;
        ctx.fillText(xVal, xPos, H - PAD_BOTTOM + 2);
    }

    // Plot lines
    data.forEach((d, i) => {
        ctx.beginPath();
        ctx.strokeStyle = COLORS[i];
        const ymax = global ? maxY : Math.max(...d.counts);
        console.log(ymax);
        d.counts.forEach((y, j) => {
            const x = PAD_LEFT + j * binWidth;
            const yNorm = H - PAD_BOTTOM - (y / ymax) * chartHeight;
            if (j === 0) ctx.moveTo(x, yNorm);
            else ctx.lineTo(x, yNorm);
        });
        ctx.stroke();
    });

    // === Build table ===
    const keys = Array.from(allKeys).sort();

    const thead = table.createTHead();
    const headRow = thead.insertRow();
    const th0 = document.createElement('th');
    th0.textContent = 'Feature';
    headRow.appendChild(th0);

    data.forEach((d, i) => {
        const th = document.createElement('th');
        th.textContent = regions[d.id]["acronym"];
        th.style.backgroundColor = COLORS[i];
        th.style.color = 'white';
        headRow.appendChild(th);
    });

    const tbody = table.createTBody();
    keys.forEach(key => {
        const row = tbody.insertRow();
        const tdKey = row.insertCell();
        tdKey.innerHTML = `<strong>${key}</strong>`;
        data.forEach(d => {
            const td = row.insertCell();
            td.textContent = features["data"][d.id][key] ?? '';
        });
    });
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

        this.statToolbox = document.getElementById('stat-toolbox');
        this.statToolboxWrapper = document.getElementById('stat-toolbox-wrapper');

        this.miniHistogram = new Histogram(document.getElementById("mini-histogram"), state, model);
        this.normalization = 'local';

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
        this.dispatcher.on('toggleStatToolbox', (e) => {
            this.toggleStatToolbox();
        });
        this.dispatcher.on('toggleNormalization', (e) => {
            this.toggleNormalization();
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
                let vmin = volume['bounds'][0];
                let vmax = volume['bounds'][1];
                let values = volume['data'];
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
                let vmin = volume['bounds'][0];
                let vmax = volume['bounds'][1];
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
        let countMax = Math.max(...counts);
        // let countSum = counts.reduce((acc, val) => acc + val, 0);
        hist.setGlobalHistogram(counts, countMax);
    }

    setLocalHistogram(hist, selected) {
        hist = hist || this.miniHistogram;
        if (this.state.selected.size == 0) {
            hist.clearLocal();

            // Clear stat toolbox.
            const canvas = document.getElementById('histogram-chart');
            const ctx = canvas.getContext('2d');
            const table = document.getElementById('stat-table');

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            table.innerHTML = '';
        }
        else {
            selected = selected || this.state.selected;
            if (!selected) {
                return;
            }

            let cmap = this.model.getColormap(this.state.cmap);

            // Load the region and features data.
            let regions = this.model.getRegions(this.state.mapping);
            let features = this.state.isVolume ? null : this.model.getFeatures(
                this.state.bucket, this.state.fname, this.state.mapping);

            let countsGlobal = this.getGlobalHistogram();
            let countMax = this.normalization == 'global' ? Math.max(...countsGlobal) : 0;

            // Now, draw the cumulated histogram of the selected region(s), if any.
            let [counts, selectedCount] = getFeatureHistogram(features, selected, BIN_COUNT);

            hist.setLocalCount(selectedCount);
            hist.setLocalHistogram(counts, countMax);

            // Stat toolbox.
            updateStatToolbox(features, regions, selected, countMax);
            // for (let value of selected) {
            //     let s = new Set();
            //     s.add(value);
            //     features["data"][value]
            //     let [countsToolbox, selectedCountToolbox] = getFeatureHistogram(features, s, BIN_COUNT);
            //     console.log(countsToolbox, selectedCountToolbox);
            // }
        }
    }

    toggleStatToolbox() {
        // console.log("toggle stat toolbox");
        this.statToolbox.classList.toggle("visible");
    }

    toggleNormalization() {
        this.normalization = this.normalization == 'global' ? 'local' : 'global';
        this.setLocalHistogram();
    }
};
