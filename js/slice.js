export { Slice };

import { throttle, getOS, e2idx } from "./utils.js";
import { getRequiredElement } from "./core/dom.js";
import { SLICE_MAX, SLICE_AXES, SLICE_STATIC_AXES } from "./constants.js";
import { EVENTS } from "./core/events.js";
import {
    getCoronalGuideState,
    getHorizontalGuideState,
    getNextSliceSliderValue,
    getSagittalGuideState,
    isRootTarget,
} from "./core/slice-helpers.js";

const SLICE_THROTTLE = 40;

class Slice {
    constructor(state, model, dispatcher) {

        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.setSlice = throttle(
            this._setSlice, SLICE_THROTTLE, { leading: true, trailing: true });

        this.tv = getRequiredElement('top-vline');
        this.th = getRequiredElement('top-hline');
        this.cv = getRequiredElement('coronal-vline');
        this.ch = getRequiredElement('coronal-hline');
        this.hv = getRequiredElement('horizontal-vline');
        this.hh = getRequiredElement('horizontal-hline');
        this.sv = getRequiredElement('sagittal-vline');
        this.sh = getRequiredElement('sagittal-hline');

        this.ml = getRequiredElement('coord-ml');
        this.ap = getRequiredElement('coord-ap');
        this.dv = getRequiredElement('coord-dv');

        this.setupDispatcher();
        this.setupSlices();
    }

    init() {
        for (let axis of SLICE_AXES) {
            this._setSlice(axis, this.state[axis]);
        }

        for (let axis of SLICE_STATIC_AXES) {
            this._setSlice(axis, 0);
        }

        this.setState(this.state);
    }

    setState(state) {
        for (let axis of SLICE_AXES) {
            this[`slider_${axis}`].value = state[axis];
            this[`set_${axis}`](state[axis]);
            this._setSlice(axis, state[axis]);

        }

        this.set_coronal(state.coronal);
        this.set_horizontal(state.horizontal);

        this._setSlice('coronal', state.coronal);
        this._setSlice('horizontal', state.horizontal);
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.RESET, () => { this.init(); });
    }

    setupSlices() {
        for (let axis of SLICE_AXES) {
            this[`svg_${axis}`] = getRequiredElement(`figure-${axis}`);
            this[`slider_${axis}`] = getRequiredElement(`slider-${axis}`);

            this.setupSlice(axis);
            this.setupHighlighting(axis);
            this.setupSelection(axis);
            this.setupTooltip(axis);
        }

        for (let axis of SLICE_STATIC_AXES) {
            this[`svg_${axis}`] = getRequiredElement(`figure-${axis}`);

            this.setupHighlighting(axis);
            this.setupSelection(axis);
            this.setupTooltip(axis);
        }
    }

    _updateLines(axis, idx) {
        if (SLICE_AXES.includes(axis)) {
            this[`set_${axis}`](idx);
        }
    }

    setupSlice(axis) {
        const max = SLICE_MAX[axis];

        const slider = this[`slider_${axis}`];
        const svg = this[`svg_${axis}`];

        slider.oninput = (e) => {
            const idx = Math.floor(e.target.value);
            this._updateLines(axis, idx);
            this.setSlice(axis, idx);
        };

        svg.parentNode.addEventListener('wheel', (e) => {
            e.preventDefault();

            slider.valueAsNumber = getNextSliceSliderValue(slider.valueAsNumber, e.deltaY, max, getOS());
            const idx = slider.valueAsNumber;

            this._updateLines(axis, idx);
            this.setSlice(axis, idx);
        }, { passive: false });
    };

    setupHighlighting(axis) {
        const svg = this[`svg_${axis}`];

        svg.addEventListener('mouseover', (e) => {
            if (e.target.tagName == 'path') {
                if (isRootTarget(e.target)) return;

                if (!e.ctrlKey) {
                    if (this.state.isVolume) {
                        this.dispatcher.volumeHover(this, axis, e);
                    }
                    const idx = e2idx(this.state.mapping, e);
                    this.dispatcher.highlight(this, idx, e);
                }
            }
        });

        svg.addEventListener('mousemove', (e) => {
            if (!this.state.isVolume) {
                return;
            }
            if (e.target.tagName == 'path' && !isRootTarget(e.target) && !e.ctrlKey) {
                this.dispatcher.volumeHover(this, axis, e);
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
                if (isRootTarget(e.target)) return;

                if (!e.ctrlKey) {
                    const idx = e2idx(this.state.mapping, e);
                    this.dispatcher.toggle(this, idx);
                }
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

    _setSlice(axis, idx) {
        const svg = this.model.getSlice(axis, idx);
        if (svg) {
            getRequiredElement(`figure-${axis}`).innerHTML = svg;
            this.state.setSliceIndex(axis, idx);
        }
        else {
            return;
        }

        this.dispatcher.slice(this, axis, idx);
    }

    set_sagittal(idx) {
        const state = getSagittalGuideState(idx, SLICE_MAX.sagittal);
        this.tv.setAttribute("x1", state.topX);
        this.tv.setAttribute("x2", state.topX);
        this.cv.setAttribute("x1", state.coronalX);
        this.cv.setAttribute("x2", state.coronalX);
        this.hv.setAttribute("x1", state.horizontalX);
        this.hv.setAttribute("x2", state.horizontalX);
        this.ml.innerHTML = `ML: ${state.ml}`;
    }

    set_coronal(idx) {
        const state = getCoronalGuideState(idx, SLICE_MAX.coronal);
        this.th.setAttribute("y1", state.topY);
        this.th.setAttribute("y2", state.topY);
        this.sv.setAttribute("x1", state.sagittalX);
        this.sv.setAttribute("x2", state.sagittalX);
        this.hh.setAttribute("y1", state.horizontalY);
        this.hh.setAttribute("y2", state.horizontalY);
        this.ap.innerHTML = `AP: ${state.ap}`;
    }

    set_horizontal(idx) {
        const state = getHorizontalGuideState(idx, SLICE_MAX.horizontal);
        this.ch.setAttribute("y1", state.coronalY);
        this.ch.setAttribute("y2", state.coronalY);
        this.sh.setAttribute("y1", state.sagittalY);
        this.sh.setAttribute("y2", state.sagittalY);
        this.dv.innerHTML = `DV: ${state.dv}`;
    }
};
