export { Slice };

import { throttle, clamp, getOS, e2idx } from "./utils.js";
import { SLICE_MAX, SLICE_AXES, SLICE_STATIC_AXES } from "./constants.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const SLICE_THROTTLE = 40;



/*************************************************************************************************/
/* Util functions                                                                                */
/*************************************************************************************************/

function isRoot(e) {
    /* Return if an event is on the root region. */
    return e.target.classList.contains("beryl_region_1");
}



/*************************************************************************************************/
/* Slice                                                                                         */
/*************************************************************************************************/

class Slice {
    constructor(state, model, dispatcher) {

        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.setSlice = throttle(this._setSlice, SLICE_THROTTLE);

        this.tv = document.getElementById('top-vline');
        this.th = document.getElementById('top-hline');
        this.cv = document.getElementById('coronal-vline');
        this.ch = document.getElementById('coronal-hline');
        this.hv = document.getElementById('horizontal-vline');
        this.hh = document.getElementById('horizontal-hline');
        this.sv = document.getElementById('sagittal-vline');
        this.sh = document.getElementById('sagittal-hline');

        this.ml = document.getElementById('coord-ml');
        this.ap = document.getElementById('coord-ap');
        this.dv = document.getElementById('coord-dv');

        this.setupDispatcher();
        this.setupSlices();
    }

    init() {
        // coronal, sagittal, horizontal
        for (let axis of SLICE_AXES) {
            this._setSlice(axis, this.state[axis]);
        }

        // top swanson
        for (let axis of SLICE_STATIC_AXES) {
            this._setSlice(axis, 0);
        }

        this.setState(this.state);
    }

    setState(state) {
        // Set the sliders.
        for (let axis of SLICE_AXES) {
            this[`slider_${axis}`].value = state[axis];
            this[`set_${axis}`](state[axis]);
            this._setSlice(axis, state[axis]);

        }

        // Set the bars.
        this.set_coronal(state.coronal);
        this.set_horizontal(state.horizontal);

        // Set the SVGs.
        this._setSlice('coronal', state.coronal);
        this._setSlice('horizontal', state.horizontal);
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.init(); });
    }

    setupSlices() {
        // coronal, sagittal, horizontal
        for (let axis of SLICE_AXES) {
            this[`svg_${axis}`] = document.getElementById(`figure-${axis}`);
            this[`slider_${axis}`] = document.getElementById(`slider-${axis}`);

            this.setupSlice(axis);
            this.setupHighlighting(axis);
            this.setupSelection(axis);
            this.setupTooltip(axis);
        }

        // top swanson
        for (let axis of SLICE_STATIC_AXES) {
            this[`svg_${axis}`] = document.getElementById(`figure-${axis}`);

            this.setupHighlighting(axis);
            this.setupSelection(axis);
            this.setupTooltip(axis);
        }
    }

    setupSlice(axis) {
        let max = SLICE_MAX[axis];

        let slider = this[`slider_${axis}`];
        let svg = this[`svg_${axis}`];

        slider.oninput = (e) => {
            let idx = Math.floor(e.target.value);
            this.setSlice(axis, idx);
        };

        let that = this;
        svg.parentNode.addEventListener('wheel', function (e) {
            e.preventDefault();

            // Update the slider.
            let x = e.deltaY;

            // HACK: handle scrolling with touchpad on mac
            let k = getOS() == "macOS" ? 4 : 24;

            if (x == 0) { return; }
            else if (x < 0) { slider.valueAsNumber += k; }
            else if (x > 0) { slider.valueAsNumber -= k; }

            slider.valueAsNumber = clamp(slider.valueAsNumber, 0, max);

            that.setSlice(axis, slider.valueAsNumber);
        }, { passive: false });
    };

    setupHighlighting(axis) {
        const svg = this[`svg_${axis}`];

        svg.addEventListener('mouseover', (e) => {
            if (e.target.tagName == 'path') {

                // HACK: disable root
                if (isRoot(e)) return;

                let idx = e2idx(this.state.mapping, e);
                this.dispatcher.highlight(this, idx, e);
            }
        });

        svg.addEventListener('mouseout', (e) => {
            if (e.target.tagName == 'path') {
                this.dispatcher.highlight(this, null, null);
            }
        });
    }

    setupSelection(axis) {
        const svg = this[`svg_${axis}`];

        svg.addEventListener('click', (e) => {
            if (e.target.tagName == 'path') {

                // HACK: disable root
                if (isRoot(e)) return;

                let idx = e2idx(this.state.mapping, e);
                this.dispatcher.toggle(this, idx);
            }
        });
    }

    setupTooltip(axis) {
        const svg = this[`svg_${axis}`];

        svg.addEventListener('mouseout', (e) => {
            if (e.target.tagName == 'path') {
                this.dispatcher.highlight(this, null, null);
            }
        });
    };

    /* Slicing functions                                                                         */
    /*********************************************************************************************/

    _setSlice(axis, idx) {
        let svg = this.model.getSlice(axis, idx);
        if (svg) {
            document.getElementById(`figure-${axis}`).innerHTML = svg;

            // Update the global state.
            this.state[axis] = idx;
        }
        else {
            // console.debug(`${idx} not in ${axis} slice`);
            return;
        }

        // call setSagittal() etc to update the hlines and vlines.
        if (SLICE_AXES.includes(axis)) {
            this[`set_${axis}`](idx);
        }

        // Emit the slice event.
        this.dispatcher.slice(this, axis, idx);

        // HACK
        let bitmap = document.getElementById(`svg-${axis}-container-inner`);
        if (bitmap) {
            // console.log(bitmap.style);
            let sidx = String(Math.floor(idx / 2.5)).padStart(4, "0");
            let url = `data/volumes/allen/${axis}/${axis}-${sidx}.jpg`
            console.log(url);

            var tempImage = new Image();
            tempImage.src = url;
            tempImage.onload = function () {
                bitmap.style.backgroundImage = `url("${url}")`;
            };
        }
    }

    set_sagittal(idx) {
        let x = idx / SLICE_MAX['sagittal'];
        x = clamp(x, .05, .95);

        let v = 236 + 225 * (x - .5);
        this.tv.setAttribute("x1", v);
        this.tv.setAttribute("x2", v);

        let w = 237 + 341 * (x - .5);
        this.cv.setAttribute("x1", w);
        this.cv.setAttribute("x2", w);

        let t = 237 + 215 * (x - .5);
        this.hv.setAttribute("x1", t);
        this.hv.setAttribute("x2", t);

        // ML coordinate.
        let ml = (-5739 + 10 * idx);
        this.ml.innerHTML = `ML: ${ml}`;
    }

    set_coronal(idx) {
        let y = idx / SLICE_MAX['coronal'];

        let v = 174 + 268 * (y - .5);
        this.th.setAttribute("y1", v);
        this.th.setAttribute("y2", v);

        let w = 236 + 352 * (y - .5);
        this.sv.setAttribute("x1", w);
        this.sv.setAttribute("x2", w);

        let t = 174 + 264 * (y - .5);
        this.hh.setAttribute("y1", t);
        this.hh.setAttribute("y2", t);

        // AP coordinate.
        let ap = (5400 - 10 * idx);
        this.ap.innerHTML = `AP: ${ap}`;
    }

    set_horizontal(idx) {
        let y = idx / SLICE_MAX['horizontal'];

        let v = 169 + 224 * (y - .5);
        this.ch.setAttribute("y1", v);
        this.ch.setAttribute("y2", v);

        let w = 170 + 198 * (y - .5);
        this.sh.setAttribute("y1", w);
        this.sh.setAttribute("y2", w);

        // DV coordinate.
        let dv = (332 - 10 * idx);
        this.dv.innerHTML = `DV: ${dv}`;
    }
};
