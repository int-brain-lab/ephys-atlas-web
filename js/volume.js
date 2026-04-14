export { Volume };

import { clamp, clearStyle } from "./utils.js";
import { getRequiredElement, getRequiredSheet } from "./core/dom.js";
import { VOLUME_AXES, VOLUME_SIZE, VOLUME_XY_AXES, getVolumeSize, setVolumeSizeDynamic } from "./constants.js";
import {
    computeAxisMapping,
    denormalizeVolumeValue,
    getVolumeHoverAxisCoords,
    getVolumePlaneSize,
    hexColorToRgb,
    indexFromAxisCoords,
} from "./core/volume-helpers.js";
import { buildVolumeVisibilityRules, getVolumeSliderMax, getVolumeSliceIndex } from "./core/volume-ui-helpers.js";
import { EVENTS } from "./core/events.js";

function makeImageData(canvas) {
    return canvas.getContext('2d').createImageData(canvas.width, canvas.height);
}

class Volume {
    constructor(state, model, dispatcher) {
        console.assert(state);
        console.assert(dispatcher);

        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.shape = null;
        this.volume = null;
        this.fortran_order = null;
        this.axisSizes = getVolumeSize();
        this.axisToRaw = null;
        this.rawToAxis = null;
        this.downsample = { coronal: 1, horizontal: 1, sagittal: 1 };
        this.volumeContainers = {};
        for (const axis of VOLUME_AXES) {
            this.volumeContainers[axis] = getRequiredElement(`svg-${axis}-container-inner`);
        }
        this.volumeArrays = {};
        this.activeVolumeName = null;

        this.style = getRequiredSheet('style-volume');

        this.canvas_coronal = getRequiredElement("canvas-coronal");
        this.canvas_horizontal = getRequiredElement("canvas-horizontal");
        this.canvas_sagittal = getRequiredElement("canvas-sagittal");

        this.baseViewBox = {};
        this.baseViewBoxSize = {};
        for (const axis of VOLUME_AXES) {
            const svg = getRequiredElement(`svg-${axis}`);
            if (svg) {
                const vb = svg.getAttribute("viewBox");
                this.baseViewBox[axis] = vb;
                if (vb) {
                    const parts = vb.split(/\s+/).map(Number);
                    if (parts.length === 4 && parts.every(isFinite)) {
                        const [, , w, h] = parts;
                        this.baseViewBoxSize[axis] = { w, h };
                    }
                }
            }
        }

        this.imageData_coronal = makeImageData(this.canvas_coronal);
        this.imageData_horizontal = makeImageData(this.canvas_horizontal);
        this.imageData_sagittal = makeImageData(this.canvas_sagittal);

        this.setupDispatcher();
    }

    showVolume() {
        clearStyle(this.style);
        for (const rule of buildVolumeVisibilityRules(true)) {
            this.style.insertRule(rule);
        }
    }

    hideVolume() {
        clearStyle(this.style);
        for (const rule of buildVolumeVisibilityRules(false)) {
            this.style.insertRule(rule);
        }
    }

    resetArrayState() {
        this.shape = null;
        this.volume = null;
        this.fortran_order = null;
        this.bounds = null;
        this.axisSizes = getVolumeSize();
        this.axisToRaw = null;
        this.rawToAxis = null;
        this.downsample = { coronal: 1, horizontal: 1, sagittal: 1 };
        this.activeVolumeName = null;
        this.volumeArrays = {};
        setVolumeSizeDynamic(null);
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.FEATURE, async (ev) => {
            if (!ev.isVolume) {
                this.hideVolume();
                this.resetArrayState();
            }
            else {
                this.showVolume();

                const state = this.state;
                const volume = this.model.getVolumeData(state.bucket, state.fname);

                if (!volume || !volume["volumes"]) {
                    this.setArray(null);
                    return;
                }

                this.volumeArrays = {};

                for (const [name, entry] of Object.entries(volume["volumes"])) {
                    if (entry && entry.volume) {
                        this.volumeArrays[name] = entry.volume;
                    }
                }

                const preferred = this.volumeArrays["mean"] ?
                    "mean" :
                    Object.keys(this.volumeArrays)[0];

                if (preferred) {
                    this.activeVolumeName = preferred;
                    this.setArray(this.volumeArrays[preferred], preferred);
                }
                else {
                    this.setArray(null);
                }

                this.draw();
            }
        });

        this.dispatcher.on(EVENTS.VOLUME_HOVER, async (ev) => {
            if (this.state.isVolume) {
                this.handleVolumeHover(ev.axis, ev.e);
            }
        });

        this.dispatcher.on(EVENTS.SLICE, async (ev) => {
            this.drawSlice(ev.axis, ev.idx);
        });

        this.dispatcher.on(EVENTS.CMAP, async () => {
            if (this.state.isVolume) {
                this.setCmap();
                this.draw();
            }
        });
        this.dispatcher.on(EVENTS.CMAP_RANGE, async () => {
            if (this.state.isVolume) {
                this.draw();
            }
        });
    }

    setCmap() {
        const colors = this.model.getColormap(this.state.cmap);
        this.colors = [];
        for (let i = 0; i < colors.length; i++) {
            this.colors[i] = hexColorToRgb(colors[i]);
        }
    }

    computeAxisMapping(shape) {
        const mapping = computeAxisMapping(shape, VOLUME_SIZE, VOLUME_AXES);
        console.log("volume axis mapping", mapping.axisToRaw, "axis sizes", mapping.axisSizes, "downsample", mapping.downsample);
        return mapping;
    }

    indexFromAxisCoords(axisCoords) {
        return indexFromAxisCoords(axisCoords, this.rawToAxis, this.shape, this.fortran_order, VOLUME_AXES);
    }

    updateCanvasSizes() {
        if (!this.axisSizes) {
            return;
        }
        for (const axis of VOLUME_AXES) {
            const canvas = this[`canvas_${axis}`];
            const svg = getRequiredElement(`svg-${axis}`);
            const container = getRequiredElement(`svg-${axis}-container-inner`);
            const plane = getVolumePlaneSize(axis, this.axisSizes, VOLUME_XY_AXES);
            if (!canvas || !plane) continue;
            const { width, height } = plane;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                this[`imageData_${axis}`] = makeImageData(canvas);
            }
            if (svg) {
                const base = this.baseViewBox[axis];
                if (base) {
                    svg.setAttribute("viewBox", base);
                }
            }
            if (container) {
                const vb = this.baseViewBoxSize[axis];
                const ratio = vb ? `${vb.w} / ${vb.h}` : `${width} / ${height}`;
                container.style.aspectRatio = ratio;
            }
        }
    }

    updateSliceRanges() {
        if (!this.axisSizes) {
            return;
        }
        for (const axis of VOLUME_AXES) {
            const slider = getRequiredElement(`slider-${axis}`);
            if (!slider) continue;
            const voxels = this.axisSizes[axis];
            const ds = this.downsample ? (this.downsample[axis] || 1) : 1;
            const max = getVolumeSliderMax(voxels, ds);
            slider.max = max;
            const value = parseInt(slider.value);
            if (value > max) {
                slider.value = max;
            }
        }
    }

    setArray(arr, volumeName = null) {
        if (!arr) {
            this.resetArrayState();
            return;
        }

        this.shape = Array.from(arr.shape);
        this.volume = arr.data;
        this.fortran_order = arr.fortran_order;
        this.bounds = arr.bounds;
        this.activeVolumeName = volumeName;
        console.log(
            "array is loaded, shape is", this.shape,
            "bounds are:", this.bounds[0], this.bounds[1],
            "fortran order:", this.fortran_order,
        );

        const mapping = this.computeAxisMapping(this.shape);
        this.axisToRaw = mapping.axisToRaw;
        this.rawToAxis = mapping.rawToAxis;
        this.axisSizes = mapping.axisSizes;
        this.downsample = mapping.downsample;
        setVolumeSizeDynamic(this.axisSizes);
        this.updateCanvasSizes();
        this.updateSliceRanges();

        this.setCmap();
    }

    drawSlice(axis, idx) {
        if (this.shape == null) {
            return;
        }

        let cmin = this.state.cmapmin * 2.55;
        let cmax = this.state.cmapmax * 2.55;
        if (cmin >= cmax) {
            return;
        }

        const nTotal = this.colors.length;
        const canvas = this[`canvas_${axis}`];
        let imageData = this[`imageData_${axis}`];
        let data = imageData.data;
        console.assert(canvas);

        const plane = getVolumePlaneSize(axis, this.axisSizes, VOLUME_XY_AXES);
        if (!plane) {
            return;
        }
        const { widthAxis, heightAxis, width, height, sliceCount } = plane;

        if (canvas.width !== width || canvas.height !== height || !imageData || imageData.width !== width || imageData.height !== height) {
            canvas.width = width;
            canvas.height = height;
            imageData = this[`imageData_${axis}`] = makeImageData(canvas);
            data = imageData.data;
        }

        const ds = this.downsample ? (this.downsample[axis] || 1) : 1;
        const sliceIdx = getVolumeSliceIndex(idx, ds, sliceCount);

        let i = 0;
        const axisCoords = [0, 0, 0];
        axisCoords[VOLUME_AXES.indexOf(axis)] = sliceIdx;
        const widthIdx = VOLUME_AXES.indexOf(widthAxis);
        const heightIdx = VOLUME_AXES.indexOf(heightAxis);

        for (let h = 0; h < height; h++) {
            axisCoords[heightIdx] = h;
            for (let w = 0; w < width; w++) {
                axisCoords[widthIdx] = w;
                const j = this.indexFromAxisCoords(axisCoords);
                let value = this.volume[j];

                value = (value - cmin) / (cmax - cmin);
                value = clamp(value, 0, .9999);
                const rgb = this.colors[Math.floor(value * nTotal)];
                if (rgb != undefined) {
                    data[i + 0] = rgb[0];
                    data[i + 1] = rgb[1];
                    data[i + 2] = rgb[2];
                }
                data[i + 3] = 255;
                i = i + 4;
            }
        }

        canvas.getContext('2d').putImageData(imageData, 0, 0);
    }

    sliceIndexFromState(axis) {
        if (!this.axisSizes || !this.axisSizes[axis]) {
            return 0;
        }
        const ds = this.downsample ? (this.downsample[axis] || 1) : 1;
        const sliceCount = this.axisSizes[axis];
        const sliderValue = this.state[axis] || 0;
        return getVolumeSliceIndex(sliderValue, ds, sliceCount);
    }

    handleVolumeHover(axis, e) {
        if (!this.state.isVolume || !axis || !e || !this.axisSizes) {
            return;
        }

        if (!this.volumeArrays || Object.keys(this.volumeArrays).length === 0) {
            return;
        }

        const container = this.volumeContainers[axis];
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const axisCoords = getVolumeHoverAxisCoords(
            axis,
            rect,
            e,
            this.axisSizes,
            VOLUME_XY_AXES,
            this.sliceIndexFromState(axis),
            VOLUME_AXES,
        );
        if (!axisCoords) {
            return;
        }

        const dataIndex = this.indexFromAxisCoords(axisCoords);
        if (dataIndex == null || dataIndex < 0) {
            return;
        }

        const values = {};
        for (const [name, arr] of Object.entries(this.volumeArrays)) {
            if (!arr || !arr.data || dataIndex >= arr.data.length) {
                continue;
            }
            const rawValue = denormalizeVolumeValue(arr.data[dataIndex], arr.bounds);
            if (rawValue == null) {
                continue;
            }
            values[name] = rawValue;
        }

        if (Object.keys(values).length === 0) {
            return;
        }

        this.dispatcher.volumeValues(this, axis, values, e);
    }

    draw() {
        console.log("redraw volume bitmaps");

        if (this.state.logScale) {
            console.warn("pseudo log scale not yet implemented on volumes");
        }

        this.drawSlice('coronal', this.state.coronal);
        this.drawSlice('horizontal', this.state.horizontal);
        this.drawSlice('sagittal', this.state.sagittal);
    }
};
