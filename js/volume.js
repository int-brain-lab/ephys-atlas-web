export { Volume };

import { e2idx, clamp, rgb2hex, clearStyle } from "./utils.js";
import { getRequiredElement, getRequiredSheet } from "./core/dom.js";
import { VOLUME_AXES, VOLUME_SIZE, VOLUME_XY_AXES, getVolumeSize, setVolumeSizeDynamic } from "./constants.js";
import { computeAxisMapping } from "./core/volume-helpers.js";
import { buildVolumeVisibilityRules, getVolumeSliderMax, getVolumeSliceIndex } from "./core/volume-ui-helpers.js";
import { EVENTS } from "./core/events.js";



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

function hexToRgb(hexColor) {
    // Remove any leading '#' symbol
    hexColor = hexColor.replace(/^#/, '');

    // Parse the hexadecimal color code into three components (R, G, B)
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);

    // Return an object with the RGB components
    return [r, g, b];
}



function makeImageData(canvas) {
    return canvas.getContext('2d').createImageData(canvas.width, canvas.height);
}



/*************************************************************************************************/
/* Volume                                                                                        */
/*************************************************************************************************/

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

    /* Internal functions                                                                        */
    /*********************************************************************************************/

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

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on(EVENTS.FEATURE, async (ev) => {
            if (!ev.isVolume) {
                this.hideVolume();

                this.shape = null;
                this.volume = null;
                this.fortran_order = null;
            }
            else {
                this.showVolume();

                const state = this.state;
                let volume = this.model.getVolumeData(state.bucket, state.fname);

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

        /* Update the canvases when the colormap changes. */
        this.dispatcher.on(EVENTS.CMAP, async (ev) => {
            if (this.state.isVolume) {
                this.setCmap();
                this.draw();
            }
        });
        this.dispatcher.on(EVENTS.CMAP_RANGE, async (ev) => {
            if (this.state.isVolume) {
                this.draw();
            }
        });
    }

    /* Main functions                                                                            */
    /*********************************************************************************************/

    setCmap() {
        // Convert the colormap to RGB values.
        let colors = this.model.getColormap(this.state.cmap);
        this.colors = [];
        for (let i = 0; i < colors.length; i++) {
            this.colors[i] = hexToRgb(colors[i]);
        }
    }

    computeAxisMapping(shape) {
        const mapping = computeAxisMapping(shape, VOLUME_SIZE, VOLUME_AXES);
        console.log("volume axis mapping", mapping.axisToRaw, "axis sizes", mapping.axisSizes, "downsample", mapping.downsample);
        return mapping;
    }

    indexFromAxisCoords(axisCoords) {
        // axisCoords follows the VOLUME_AXES order.
        const coordsRaw = [0, 0, 0];
        for (let raw = 0; raw < 3; raw++) {
            const axisName = this.rawToAxis ? this.rawToAxis[raw] : VOLUME_AXES[raw];
            const axisIdx = VOLUME_AXES.indexOf(axisName);
            coordsRaw[raw] = axisCoords[axisIdx];
        }

        const [s0, s1, s2] = this.shape;
        if (this.fortran_order) {
            return coordsRaw[0] + s0 * (coordsRaw[1] + s1 * coordsRaw[2]);
        }
        return coordsRaw[0] * s1 * s2 + coordsRaw[1] * s2 + coordsRaw[2];
    }

    updateCanvasSizes() {
        if (!this.axisSizes) {
            return;
        }
        for (const axis of VOLUME_AXES) {
            const canvas = this[`canvas_${axis}`];
            const svg = getRequiredElement(`svg-${axis}`);
            const container = getRequiredElement(`svg-${axis}-container-inner`);
            if (!canvas) continue;
            const widthAxis = VOLUME_XY_AXES[axis][0];
            const heightAxis = VOLUME_XY_AXES[axis][1];
            const width = this.axisSizes[widthAxis];
            const height = this.axisSizes[heightAxis];
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
            this.shape = null;
            this.volume = null;
            this.fortran_order = null;
            this.axisSizes = getVolumeSize();
            this.axisToRaw = null;
            this.rawToAxis = null;
            this.downsample = { coronal: 1, horizontal: 1, sagittal: 1 };
            this.activeVolumeName = null;
            this.volumeArrays = {};
            setVolumeSizeDynamic(null);
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

        // NOTE: the array values are always in [0, 255] as they were downsampled from the original
        // array. We can retrieve the min and max values of the original array in this.bounds

        // NOTE: cmapmin and cmapmax are in [0, 100], but we want values between [0, 255].
        let cmin = this.state.cmapmin * 2.55;
        let cmax = this.state.cmapmax * 2.55;
        if (cmin >= cmax) {
            return;
        }

        let nTotal = this.colors.length;

        let canvas = this[`canvas_${axis}`];
        let imageData = this[`imageData_${axis}`];
        let data = imageData.data;
        console.assert(canvas);

        const widthAxis = VOLUME_XY_AXES[axis][0];
        const heightAxis = VOLUME_XY_AXES[axis][1];
        const width = this.axisSizes[widthAxis];
        const height = this.axisSizes[heightAxis];
        const sliceCount = this.axisSizes[axis];

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
        if (!rect.width || !rect.height) {
            return;
        }

        const widthAxis = VOLUME_XY_AXES[axis][0];
        const heightAxis = VOLUME_XY_AXES[axis][1];
        const widthCount = this.axisSizes[widthAxis];
        const heightCount = this.axisSizes[heightAxis];
        if (!widthCount || !heightCount) {
            return;
        }

        const relativeX = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const relativeY = clamp((e.clientY - rect.top) / rect.height, 0, 1);
        const widthCoord = clamp(Math.floor(relativeX * widthCount), 0, widthCount - 1);
        const heightCoord = clamp(Math.floor(relativeY * heightCount), 0, heightCount - 1);

        const axisCoords = [0, 0, 0];
        axisCoords[VOLUME_AXES.indexOf(axis)] = this.sliceIndexFromState(axis);
        axisCoords[VOLUME_AXES.indexOf(widthAxis)] = widthCoord;
        axisCoords[VOLUME_AXES.indexOf(heightAxis)] = heightCoord;

        const dataIndex = this.indexFromAxisCoords(axisCoords);
        if (dataIndex == null || dataIndex < 0) {
            return;
        }

        const values = {};
        for (const [name, arr] of Object.entries(this.volumeArrays)) {
            if (!arr || !arr.data || dataIndex >= arr.data.length) {
                continue;
            }
            let rawValue = arr.data[dataIndex];
            if (rawValue == null) {
                continue;
            }
            if (arr.bounds && arr.bounds.length >= 2) {
                const min = arr.bounds[0];
                const max = arr.bounds[1];
                if (isFinite(min) && isFinite(max) && max > min) {
                    rawValue = min + (rawValue / 255) * (max - min);
                }
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
