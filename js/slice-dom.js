import { e2idx, getOS } from "./utils.js";
import { getRequiredElement } from "./core/dom.js";
import { getNextSliceSliderValue, isRootTarget } from "./core/slice-helpers.js";

export function getSliceGuideElements(root = document) {
    return {
        tv: getRequiredElement('top-vline', root),
        th: getRequiredElement('top-hline', root),
        cv: getRequiredElement('coronal-vline', root),
        ch: getRequiredElement('coronal-hline', root),
        hv: getRequiredElement('horizontal-vline', root),
        hh: getRequiredElement('horizontal-hline', root),
        sv: getRequiredElement('sagittal-vline', root),
        sh: getRequiredElement('sagittal-hline', root),
    };
}

export function getSliceCoordinateElements(root = document) {
    return {
        ml: getRequiredElement('coord-ml', root),
        ap: getRequiredElement('coord-ap', root),
        dv: getRequiredElement('coord-dv', root),
    };
}

export function getSliceAxisElements(axis, { withSlider = true, root = document } = {}) {
    const elements = {
        svg: getRequiredElement(`figure-${axis}`, root),
    };
    if (withSlider) {
        elements.slider = getRequiredElement(`slider-${axis}`, root);
    }
    return elements;
}

export function bindSliceSliderAndWheel({ axis, slider, svg, max, onChange }) {
    slider.oninput = (e) => {
        const idx = Math.floor(e.target.value);
        onChange(idx);
    };

    svg.parentNode.addEventListener('wheel', (e) => {
        e.preventDefault();
        slider.valueAsNumber = getNextSliceSliderValue(slider.valueAsNumber, e.deltaY, max, getOS());
        onChange(slider.valueAsNumber);
    }, { passive: false });
}

export function bindSliceHighlighting({ axis, svg, state, dispatcher, source }) {
    svg.addEventListener('mouseover', (e) => {
        if (e.target.tagName == 'path') {
            if (isRootTarget(e.target)) return;

            if (!e.ctrlKey) {
                if (state.isVolume) {
                    dispatcher.volumeHover(source, axis, e);
                }
                const idx = e2idx(state.mapping, e);
                dispatcher.highlight(source, idx, e);
            }
        }
    });

    svg.addEventListener('mousemove', (e) => {
        if (!state.isVolume) {
            return;
        }
        if (e.target.tagName == 'path' && !isRootTarget(e.target) && !e.ctrlKey) {
            dispatcher.volumeHover(source, axis, e);
        }
    });

    svg.addEventListener('mouseout', (e) => {
        if (e.target.tagName == 'path') {
            dispatcher.highlight(source, null, null);
        }
    });
}

export function bindSliceSelection({ svg, state, dispatcher, source }) {
    svg.addEventListener('click', (e) => {
        if (e.target.tagName == 'path') {
            if (isRootTarget(e.target)) return;

            if (!e.ctrlKey) {
                const idx = e2idx(state.mapping, e);
                dispatcher.toggle(source, idx);
            }
        }
    });
}
