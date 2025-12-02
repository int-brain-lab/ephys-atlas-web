export { Volume };

import { e2idx, clamp, rgb2hex, clearStyle } from "./utils.js";
import { VOLUME_AXES, VOLUME_SIZE, VOLUME_XY_AXES, getVolumeSize, setVolumeSizeDynamic } from "./constants.js";



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

        this.style = document.getElementById('style-volume').sheet;

        this.canvas_coronal = document.getElementById("canvas-coronal");
        this.canvas_horizontal = document.getElementById("canvas-horizontal");
        this.canvas_sagittal = document.getElementById("canvas-sagittal");

        this.imageData_coronal = makeImageData(this.canvas_coronal);
        this.imageData_horizontal = makeImageData(this.canvas_horizontal);
        this.imageData_sagittal = makeImageData(this.canvas_sagittal);

        this.setupDispatcher();
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    showVolume() {
        clearStyle(this.style);
        let s = 'fill-opacity: 0%; stroke: #ccc;';

        this.style.insertRule(`#svg-coronal-container svg path { ${s} }\n`);
        this.style.insertRule(`#svg-horizontal-container svg path { ${s} }\n`);
        this.style.insertRule(`#svg-sagittal-container svg path { ${s} }\n`);
    }

    hideVolume() {
        clearStyle(this.style);
        let s = 'fill-opacity: 100%; stroke: #0;';

        this.style.insertRule(`#svg-coronal-container svg path { ${s} }\n`);
        this.style.insertRule(`#svg-horizontal-container svg path { ${s} }\n`);
        this.style.insertRule(`#svg-sagittal-container svg path { ${s} }\n`);

        this.style.insertRule(`#canvas-coronal { visibility: hidden; }\n`);
        this.style.insertRule(`#canvas-horizontal { visibility: hidden; }\n`);
        this.style.insertRule(`#canvas-sagittal { visibility: hidden; }\n`);
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('feature', async (ev) => {
            if (!ev.isVolume) {
                this.hideVolume();

                this.shape = null;
                this.volume = null;
                this.fortran_order = null;
            }
            else {
                this.showVolume();

                const state = this.state;
                let volume = this.model.getFeatures(state.bucket, state.fname);

                // HACK TODO: choose the volume.
                volume = volume["mean"]["volume"];

                this.setArray(volume);
                this.draw();
            }
        });

        this.dispatcher.on('slice', async (ev) => {
            this.drawSlice(ev.axis, ev.idx);
        });

        /* Update the canvases when the colormap changes. */
        this.dispatcher.on('cmap', async (ev) => {
            if (this.state.isVolume) {
                this.setCmap();
                this.draw();
            }
        });
        this.dispatcher.on('cmapRange', async (ev) => {
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
        const baseSize = VOLUME_SIZE;
        const canonical = [baseSize.coronal, baseSize.horizontal, baseSize.sagittal];
        const axes = VOLUME_AXES;
        const permutations = [
            [0, 1, 2],
            [0, 2, 1],
            [1, 0, 2],
            [1, 2, 0],
            [2, 0, 1],
            [2, 1, 0],
        ];

        let best = null;
        for (const perm of permutations) {
            const dims = perm.map(idx => shape[idx]);
            if (dims.some(d => !isFinite(d) || d <= 0)) {
                continue;
            }
            const ratios = dims.map((d, idx) => canonical[idx] / d);
            if (ratios.some(r => !isFinite(r) || r <= 0)) {
                continue;
            }
            const errors = ratios.map(r => Math.abs(Math.round(r) - r));
            const totalError = errors.reduce((a, b) => a + b, 0);
            const maxError = Math.max(...errors);
            if (best === null || totalError < best.totalError || (totalError === best.totalError && maxError < best.maxError)) {
                best = { perm, dims, ratios, totalError, maxError };
            }
        }

        if (!best) {
            console.warn("cannot infer axis mapping, fallback to identity");
            const axisToRaw = { coronal: 0, horizontal: 1, sagittal: 2 };
            return {
                axisToRaw,
                rawToAxis: { 0: "coronal", 1: "horizontal", 2: "sagittal" },
                axisSizes: {
                    coronal: shape[0],
                    horizontal: shape[1],
                    sagittal: shape[2],
                },
                downsample: { coronal: 1, horizontal: 1, sagittal: 1 },
            };
        }

        const axisToRaw = {
            coronal: best.perm[0],
            horizontal: best.perm[1],
            sagittal: best.perm[2],
        };
        const rawToAxis = {};
        for (const [axis, rawIdx] of Object.entries(axisToRaw)) {
            rawToAxis[rawIdx] = axis;
        }

        const axisSizes = {
            coronal: shape[axisToRaw.coronal],
            horizontal: shape[axisToRaw.horizontal],
            sagittal: shape[axisToRaw.sagittal],
        };

        const downsample = {
            coronal: canonical[0] / axisSizes.coronal,
            horizontal: canonical[1] / axisSizes.horizontal,
            sagittal: canonical[2] / axisSizes.sagittal,
        };

        console.log("volume axis mapping", axisToRaw, "axis sizes", axisSizes, "downsample", downsample);

        return {
            axisToRaw,
            rawToAxis,
            axisSizes,
            downsample,
        };
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
        }
    }

    updateSliceRanges() {
        if (!this.axisSizes) {
            return;
        }
        for (const axis of VOLUME_AXES) {
            const slider = document.getElementById(`slider-${axis}`);
            if (!slider) continue;
            const voxels = this.axisSizes[axis];
            const ds = this.downsample ? (this.downsample[axis] || 1) : 1;
            const max = Math.round(voxels * 2.5 * ds);
            slider.max = max;
            const value = parseInt(slider.value);
            if (value > max) {
                slider.value = max;
            }
        }
    }

    setArray(arr) {
        if (!arr) {
            this.shape = null;
            this.volume = null;
            this.fortran_order = null;
            this.axisSizes = getVolumeSize();
            this.axisToRaw = null;
            this.rawToAxis = null;
            this.downsample = { coronal: 1, horizontal: 1, sagittal: 1 };
            setVolumeSizeDynamic(null);
            return;
        }

        this.shape = Array.from(arr.shape);
        this.volume = arr.data;
        this.fortran_order = arr.fortran_order;
        this.bounds = arr.bounds;
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
        const sliceIdx = clamp(Math.floor(idx / (2.5 * ds)), 0, sliceCount - 1);

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
