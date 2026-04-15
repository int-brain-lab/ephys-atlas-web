export { Slice };

import { throttle } from "./utils.js";
import { SLICE_MAX, SLICE_AXES, SLICE_STATIC_AXES } from "./constants.js";
import { EVENTS } from "./core/events.js";
import {
    getCoronalGuideState,
    getHorizontalGuideState,
    getSagittalGuideState,
} from "./core/slice-helpers.js";
import {
    bindSliceHighlighting,
    bindSliceSelection,
    bindSliceSliderAndWheel,
    getSliceAxisElements,
    getSliceCoordinateElements,
    getSliceGuideElements,
} from "./slice-dom.js";

const SLICE_THROTTLE = 40;

class Slice {
    constructor(state, model, dispatcher) {

        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.setSlice = throttle(
            this._setSlice, SLICE_THROTTLE, { leading: true, trailing: true });

        Object.assign(this, getSliceGuideElements());
        Object.assign(this, getSliceCoordinateElements());

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
            const { svg, slider } = getSliceAxisElements(axis);
            this[`svg_${axis}`] = svg;
            this[`slider_${axis}`] = slider;

            this.setupSlice(axis);
            this.setupHighlighting(axis);
            this.setupSelection(axis);
        }

        for (let axis of SLICE_STATIC_AXES) {
            const { svg } = getSliceAxisElements(axis, { withSlider: false });
            this[`svg_${axis}`] = svg;

            this.setupHighlighting(axis);
            this.setupSelection(axis);
        }
    }

    _updateLines(axis, idx) {
        if (SLICE_AXES.includes(axis)) {
            this[`set_${axis}`](idx);
        }
    }

    setupSlice(axis) {
        bindSliceSliderAndWheel({
            axis,
            slider: this[`slider_${axis}`],
            svg: this[`svg_${axis}`],
            max: SLICE_MAX[axis],
            onChange: (idx) => {
                this._updateLines(axis, idx);
                this.setSlice(axis, idx);
            },
        });
    };

    setupHighlighting(axis) {
        bindSliceHighlighting({
            axis,
            svg: this[`svg_${axis}`],
            state: this.state,
            dispatcher: this.dispatcher,
            source: this,
        });
    }

    setupSelection(axis) {
        bindSliceSelection({
            svg: this[`svg_${axis}`],
            state: this.state,
            dispatcher: this.dispatcher,
            source: this,
        });
    }

    _setSlice(axis, idx) {
        const svg = this.model.getSlice(axis, idx);
        if (svg) {
            this[`svg_${axis}`].innerHTML = svg;
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
