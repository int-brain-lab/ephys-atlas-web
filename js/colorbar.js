export { Colorbar };

import { displayNumber } from "./utils.js";
import { getRequiredElement } from "./core/dom.js";
import { EVENTS } from "./core/events.js";
import { BIN_COUNT, getFeatureHistogram } from "./core/histogram-helpers.js";
import { drawHistogram } from "./core/histogram-dom.js";
import {
    resolveColorbarRange,
    resolveGlobalHistogramCounts,
} from "./core/colorbar-helpers.js";

class Histogram {
    constructor(parentDiv, state, model) {
        console.assert(parentDiv);

        this.state = state;
        this.model = model;

        this.cmap = null;
        this.cmin = null;
        this.cmax = null;

        parentDiv.innerHTML = "";

        const colorbarWrapper = document.createElement("div");
        colorbarWrapper.className = "colorbar-wrapper";

        this.cbar = document.createElement("div");
        this.cbar.className = "colorbar";
        colorbarWrapper.appendChild(this.cbar);

        this.cbar2 = document.createElement("div");
        this.cbar2.className = "colorbar";
        colorbarWrapper.appendChild(this.cbar2);

        parentDiv.appendChild(colorbarWrapper);

        const hr = document.createElement("hr");
        parentDiv.appendChild(hr);

        const rangeWrapper = document.createElement("div");
        rangeWrapper.className = "wrapper";

        this.featureMin = document.createElement("div");
        this.featureMin.className = "min";
        rangeWrapper.appendChild(this.featureMin);

        this.featureMax = document.createElement("div");
        this.featureMax.className = "max";
        rangeWrapper.appendChild(this.featureMax);

        parentDiv.appendChild(rangeWrapper);

        const miniStats = document.createElement("div");
        miniStats.className = "mini-stats";

        this.countTotal = document.createElement("div");
        this.countTotal.className = "count-total";
        miniStats.appendChild(this.countTotal);

        this.countSelected = document.createElement("div");
        this.countSelected.className = "count-selected";
        miniStats.appendChild(this.countSelected);

        parentDiv.appendChild(miniStats);

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

class Colorbar {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.miniHistogram = new Histogram(getRequiredElement("mini-histogram"), state, model);

        this.setupDispatcher();
    }

    init() {
        this.setState(this.state);
    }

    setState() {
        this.setGlobalHistogram();
        this.setLocalHistogram();
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.RESET, () => { this.init(); });
        this.dispatcher.on(EVENTS.BUCKET, () => { this.clear(); });
        this.dispatcher.on(EVENTS.FEATURE, () => {
            this.setColormap();
            this.setGlobalHistogram();
            this.setLocalHistogram();
        });
        this.dispatcher.on(EVENTS.CMAP, () => {
            this.setColormap();
            this.setGlobalHistogram();
            this.setLocalHistogram();
        });
        this.dispatcher.on(EVENTS.CMAP_RANGE, () => {
            this.setColormap();
            this.setGlobalHistogram();
            this.setLocalHistogram();
        });
        this.dispatcher.on(EVENTS.MAPPING, () => {
            this.setGlobalHistogram();
            this.setLocalHistogram();
        });
        this.dispatcher.on(EVENTS.STAT, () => {
            this.setGlobalHistogram();
        });
        this.dispatcher.on(EVENTS.TOGGLE, () => {
            this.setLocalHistogram();
        });
        this.dispatcher.on(EVENTS.CLEAR, () => {
            this.setLocalHistogram();
        });
    }

    getGlobalHistogram() {
        if (!this.state.fname) {
            this.clear();
            return null;
        }

        const histogram = this.model.getHistogram(this.state.bucket, this.state.fname);
        const features = this.state.isVolume ? null : this.model.getFeatures(
            this.state.bucket,
            this.state.fname,
            this.state.mapping,
        );
        const regions = this.model.getRegions(this.state.mapping);

        return resolveGlobalHistogramCounts(
            histogram,
            this.state.isVolume,
            regions,
            features,
            this.state.stat,
            BIN_COUNT,
        );
    }

    clear(hist) {
        hist = hist || this.miniHistogram;
        hist.clear();
    }

    setFeatureRange(hist) {
        hist = hist || this.miniHistogram;
        const range = resolveColorbarRange(
            this.model.getHistogram(this.state.bucket, this.state.fname),
            this.model.getVolumeData(this.state.bucket, this.state.fname),
        );
        if (!range) {
            return;
        }
        hist.setFeatureRange(range.vmin, range.vmax);
        if (range.totalCount != null) {
            hist.setGlobalCount(range.totalCount);
        }
    }

    setColormap(hist) {
        hist = hist || this.miniHistogram;
        const cmap = this.model.getColormap(this.state.cmap);
        hist.setColormap(cmap, this.state.cmapmin, this.state.cmapmax);
    }

    setGlobalHistogram(hist) {
        hist = hist || this.miniHistogram;
        this.setFeatureRange(hist);
        const counts = this.getGlobalHistogram();
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

        const features = this.state.isVolume ? null : this.model.getFeatures(
            this.state.bucket,
            this.state.fname,
            this.state.mapping,
        );

        if (!features) {
            hist.clearLocal();
            return;
        }

        const [counts, selectedCount] = getFeatureHistogram(features, selection, BIN_COUNT);
        hist.setLocalCount(selectedCount);
        const countMax = Math.max(...counts);
        hist.setLocalHistogram(counts, countMax);
    }
};
