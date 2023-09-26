export { Volume };

import { e2idx, clamp, rgb2hex, clearStyle } from "./utils.js";
import { VOLUME_AXES, VOLUME_SIZE } from "./constants.js";



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
        this.dispatcher.on('volume', async (ev) => {
            if (ev.fname) {
                this.showVolume();

                let volume = await app.model.getVolume(this.state.bucket, ev.fname);
                this.setArray(volume);
                this.draw();
            }
            else {
                this.hideVolume();

                this.shape = null;
                this.volume = null;
                this.fortran_order = null;
            }
        });

        this.dispatcher.on('feature', async (ev) => {
            if (ev.fname) {
                this.hideVolume();
            }
        });

        /* Update the canvases when the colormap changes. */
        this.dispatcher.on('cmap', async (ev) => {
            this.setCmap();
            this.draw();
        });
        this.dispatcher.on('cmapRange', async (ev) => {
            this.draw();
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

    setArray(arr) {
        if (!arr) {
            this.shape = null;
            this.volume = null;
            this.fortran_order = null;
            return;
        }

        this.shape = arr.shape;
        this.volume = arr.data;
        this.fortran_order = arr.fortran_order;
        this.bounds = arr.bounds;
        console.log(
            "array is loaded, shape is", this.shape,
            "bounds are:", this.bounds[0], this.bounds[1],
            "fortran order:", this.fortran_order,
        );

        this.setCmap();
    }

    drawSlice(axis, idx) {
        if (this.shape == null) {
            return;
        }

        // 528, 320, 456
        // coronal: 528, x
        // horizontal: 320, HEIGHT y
        // sagittal: 456, WIDTH z
        const [dimX, dimY, dimZ] = this.shape;

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

        // NOTE: coronal, axis=0
        let i = 0;
        let j = 0;
        let value = 0;
        let rgb = null;

        // HACK: we have only implemented Fortran order so far.
        console.assert(this.fortran_order);

        // NOTE: we copy-paste instead of using a function otherwise the javascript engine won't
        // be able to optimize this tight loop properly.
        if (axis == 'coronal') {
            let x = Math.floor(idx / 2.5);
            for (let y = 0; y < dimY; y++) {
                for (let z = 0; z < dimZ; z++) {
                    // let j = x * dimY * dimZ + y * dimZ + z; // C order
                    j = x + dimX * (y + dimY * z); // Fortran order
                    value = this.volume[j];

                    value = (value - cmin) / (cmax - cmin);
                    value = clamp(value, 0, .9999);
                    rgb = this.colors[Math.floor(value * nTotal)];
                    data[i + 0] = rgb[0];
                    data[i + 1] = rgb[1];
                    data[i + 2] = rgb[2];
                    data[i + 3] = 255;
                    i = i + 4;
                }
            }
        }
        else if (axis == 'horizontal') {
            let y = Math.floor(idx / 2.5);
            for (let x = 0; x < dimX; x++) {
                for (let z = 0; z < dimZ; z++) {
                    // let j = x * dimY * dimZ + y * dimZ + z; // C order
                    j = x + dimX * (y + dimY * z); // Fortran order
                    value = this.volume[j];

                    value = (value - cmin) / (cmax - cmin);
                    value = clamp(value, 0, .9999);
                    rgb = this.colors[Math.floor(value * nTotal)];
                    data[i + 0] = rgb[0];
                    data[i + 1] = rgb[1];
                    data[i + 2] = rgb[2];
                    data[i + 3] = 255;
                    i = i + 4;
                }
            }
        }
        else if (axis == 'sagittal') {
            let z = Math.floor(idx / 2.5);
            for (let y = 0; y < dimY; y++) {
                for (let x = 0; x < dimX; x++) {
                    // let j = x * dimY * dimZ + y * dimZ + z; // C order
                    j = x + dimX * (y + dimY * z); // Fortran order
                    value = this.volume[j];

                    value = (value - cmin) / (cmax - cmin);
                    value = clamp(value, 0, .9999);
                    rgb = this.colors[Math.floor(value * nTotal)];
                    data[i + 0] = rgb[0];
                    data[i + 1] = rgb[1];
                    data[i + 2] = rgb[2];
                    data[i + 3] = 255;
                    i = i + 4;
                }
            }
        }

        canvas.getContext('2d').putImageData(imageData, 0, 0);
    }

    draw() {
        console.log("redraw volume bitmaps");

        if (this.state.logScale) {
            console.warn("log scale not yet implemented on volumes");
        }

        this.drawSlice('coronal', this.state.coronal);
        this.drawSlice('horizontal', this.state.horizontal);
        this.drawSlice('sagittal', this.state.sagittal);
    }
};
