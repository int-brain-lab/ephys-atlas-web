export { StatToolbox };

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const BIN_COUNT = 50;
const MAX_SELECTED = 5;
const COLORS = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00'];
const GAUSSIAN_SIGMA = 1.0;

function gaussianSmooth(values, sigma = GAUSSIAN_SIGMA) {
    const radius = Math.max(1, Math.ceil(sigma * 3));
    const kernel = [];
    for (let i = -radius; i <= radius; i++) {
        kernel.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
    }
    const norm = kernel.reduce((acc, v) => acc + v, 0);

    return values.map((_, idx) => {
        let acc = 0;
        for (let k = -radius; k <= radius; k++) {
            const pos = idx + k;
            if (pos < 0 || pos >= values.length) continue;
            acc += values[pos] * kernel[k + radius];
        }
        return norm > 0 ? acc / norm : acc;
    });
}

function getRegionHistogram(features, regionIdx, binCount) {
    const histogram = new Array(binCount).fill(0);
    const region = features?.["data"]?.[regionIdx];
    if (!region) return [histogram, 0];

    let total = 0;
    Object.entries(region).forEach(([key, value]) => {
        const match = key.match(/^h_(\d+)$/);
        if (match) {
            const index = parseInt(match[1], 10);
            if (index >= 0 && index < binCount) {
                histogram[index] += value;
                total += value;
            }
        }
    });

    return [histogram, total];
}

class StatToolbox {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.container = document.getElementById('stat-toolbox');
        this.wrapper = document.getElementById('stat-toolbox-wrapper');
        this.svg = d3.select('#stat-violin');
        this.table = document.getElementById('stat-table');

        this.setupDispatcher();
    }

    setupDispatcher() {
        const rerender = () => this.update();

        this.dispatcher.on('reset', () => this.clear());
        this.dispatcher.on('bucket', rerender);
        this.dispatcher.on('bucketRemove', rerender);
        this.dispatcher.on('refresh', rerender);
        this.dispatcher.on('feature', rerender);
        this.dispatcher.on('stat', rerender);
        this.dispatcher.on('mapping', rerender);
        this.dispatcher.on('toggle', rerender);
        this.dispatcher.on('clear', () => this.clear());
        this.dispatcher.on('toggleStatToolbox', () => this.toggle());
    }

    toggle() {
        if (!this.container) return;
        this.container.classList.toggle("visible");
        if (this.container.classList.contains("visible")) {
            this.update();
        }
    }

    clear() {
        this.clearSvg();
        if (this.table) {
            this.table.innerHTML = '';
        }
    }

    clearSvg() {
        if (this.svg) {
            this.svg.selectAll('*').remove();
        }
    }

    update() {
        if (!this.container) return;

        const selected = Array.from(this.state.selected || []).slice(0, MAX_SELECTED);
        if (!this.state.fname || this.state.isVolume || selected.length === 0) {
            this.clear();
            return;
        }

        const histogram = this.model.getHistogram(this.state.bucket, this.state.fname);
        const features = this.model.getFeatures(this.state.bucket, this.state.fname, this.state.mapping);
        const regions = this.model.getRegions(this.state.mapping);

        if (!histogram || !features || !regions) {
            this.clear();
            return;
        }

        const binCount = histogram.counts ? histogram.counts.length : BIN_COUNT;
        const vmin = histogram.vmin;
        const vmax = histogram.vmax;
        const binWidth = (vmax - vmin) / binCount;
        const binCenters = Array.from({ length: binCount }, (_, i) => vmin + (i + 0.5) * binWidth);

        const series = [];

        selected.forEach((regionIdx, i) => {
            const [rawCounts, totalCount] = getRegionHistogram(features, regionIdx, binCount);
            if (totalCount <= 0) return;

            const smoothed = gaussianSmooth(rawCounts);
            const smoothedSum = smoothed.reduce((acc, v) => acc + v, 0);
            const scaled = smoothedSum > 0 ? smoothed.map(v => v * (totalCount / smoothedSum)) : smoothed;
            const density = scaled.map(v => v / totalCount);

            series.push({
                id: regionIdx,
                acronym: regions[regionIdx]?.acronym || regionIdx,
                color: COLORS[i % COLORS.length],
                density,
            });
        });

        if (series.length === 0) {
            this.clear();
            return;
        }

        this.drawViolin(series, binCenters, vmin, vmax);
        this.buildTable(series, features, regions);
    }

    drawViolin(series, binCenters, vmin, vmax) {
        this.clearSvg();

        const node = this.svg.node();
        if (!node) return;

        const width = node.clientWidth || parseFloat(this.svg.attr('width')) || 400;
        const height = node.clientHeight || parseFloat(this.svg.attr('height')) || 260;
        this.svg.attr('viewBox', `0 0 ${width} ${height}`);

        const margin = { top: 16, right: 16, bottom: 40, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const maxDensity = d3.max(series, s => d3.max(s.density)) || 1;
        const labelMap = new Map(series.map(s => [s.id.toString(), s.acronym]));

        const x = d3.scaleBand()
            .domain(series.map(s => s.id.toString()))
            .range([0, innerWidth])
            .padding(0.25);

        const y = d3.scaleLinear()
            .domain([vmin, vmax])
            .nice()
            .range([innerHeight, 0]);

        const widthScale = d3.scaleLinear()
            .domain([0, maxDensity])
            .range([0, x.bandwidth() / 2]);

        const g = this.svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const yAxis = d3.axisLeft(y).ticks(5);
        g.append('g').call(yAxis);

        const xAxis = d3.axisBottom(x).tickFormat((d) => labelMap.get(d) || d);
        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis);

        series.forEach((s) => {
            const center = (x(s.id.toString()) ?? 0) + x.bandwidth() / 2;
            const data = binCenters.map((value, idx) => ({ value, density: s.density[idx] }));

            const area = d3.area()
                .x0(d => center - widthScale(d.density))
                .x1(d => center + widthScale(d.density))
                .y(d => y(d.value))
                .curve(d3.curveCatmullRom);

            g.append('path')
                .attr('d', area(data))
                .attr('fill', s.color)
                .attr('fill-opacity', 0.45)
                .attr('stroke', s.color)
                .attr('stroke-width', 1);
        });
    }

    buildTable(series, features, regions) {
        if (!this.table) return;
        this.table.innerHTML = '';

        const allKeys = new Set();
        series.forEach(s => {
            const data = features["data"]?.[s.id];
            if (!data) return;
            Object.keys(data).forEach(k => {
                if (!k.startsWith('h_')) allKeys.add(k);
            });
        });

        const keys = Array.from(allKeys).sort();
        if (keys.length === 0) return;

        const thead = this.table.createTHead();
        const headRow = thead.insertRow();
        const th0 = document.createElement('th');
        th0.textContent = 'Feature';
        headRow.appendChild(th0);

        series.forEach((s, i) => {
            const th = document.createElement('th');
            th.textContent = regions[s.id]?.acronym || s.id;
            th.style.backgroundColor = s.color;
            th.style.color = 'white';
            headRow.appendChild(th);
        });

        const tbody = this.table.createTBody();
        keys.forEach(key => {
            const row = tbody.insertRow();
            const tdKey = row.insertCell();
            tdKey.innerHTML = `<strong>${key}</strong>`;

            series.forEach(s => {
                const td = row.insertCell();
                const value = features["data"]?.[s.id]?.[key];
                td.textContent = value ?? '';
            });
        });
    }
}
