import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
    navigator: {
        userAgent: 'Linux',
        platform: 'Linux',
        maxTouchPoints: 0,
    },
};

globalThis.document = {
    createElement() {
        return {};
    },
};

const {
    bindSliceHighlighting,
    bindSliceSelection,
    bindSliceSliderAndWheel,
    getSliceAxisElements,
    getSliceCoordinateElements,
    getSliceGuideElements,
} = await import('../../js/slice-dom.js');

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.listeners = {};
        this.parentNode = null;
        this.innerHTML = '';
    }

    addEventListener(name, callback) {
        this.listeners[name] = callback;
    }

    dispatch(name, event) {
        this.listeners[name](event);
    }
}

function makePath(classNames = []) {
    return {
        tagName: 'path',
        classList: {
            contains(name) {
                return classNames.includes(name);
            },
            [Symbol.iterator]: function* () {
                yield* classNames;
            },
        },
    };
}

test('slice DOM lookup helpers fetch the expected elements', () => {
    const elements = new Map();
    for (const id of ['top-vline', 'top-hline', 'coronal-vline', 'coronal-hline', 'horizontal-vline', 'horizontal-hline', 'sagittal-vline', 'sagittal-hline', 'coord-ml', 'coord-ap', 'coord-dv', 'figure-coronal', 'slider-coronal']) {
        elements.set(id, { id });
    }
    const root = {
        getElementById(id) {
            return elements.get(id) || null;
        },
    };

    assert.equal(getSliceGuideElements(root).tv.id, 'top-vline');
    assert.equal(getSliceCoordinateElements(root).ml.id, 'coord-ml');
    const axisElements = getSliceAxisElements('coronal', { root });
    assert.equal(axisElements.svg.id, 'figure-coronal');
    assert.equal(axisElements.slider.id, 'slider-coronal');
});

test('bindSliceSliderAndWheel forwards slider and wheel updates through onChange', () => {
    const slider = { valueAsNumber: 10, oninput: null };
    const parent = new FakeElement('div');
    const svg = new FakeElement('svg');
    svg.parentNode = parent;
    const seen = [];

    bindSliceSliderAndWheel({
        axis: 'coronal',
        slider,
        svg,
        max: 100,
        onChange(idx) {
            seen.push(idx);
        },
    });

    slider.oninput({ target: { value: '42.9' } });
    parent.dispatch('wheel', {
        deltaY: -1,
        preventDefault() {},
    });

    assert.deepEqual(seen, [42, 34]);
});

test('bindSliceHighlighting dispatches hover, highlight, and clear events', () => {
    const svg = new FakeElement('svg');
    const calls = [];
    const dispatcher = {
        volumeHover(source, axis) {
            calls.push(['volumeHover', source, axis]);
        },
        highlight(source, idx) {
            calls.push(['highlight', source, idx]);
        },
    };
    const source = { name: 'slice' };

    bindSliceHighlighting({
        axis: 'coronal',
        svg,
        state: { isVolume: true, mapping: 'allen' },
        dispatcher,
        source,
    });

    svg.dispatch('mouseover', { target: makePath(['allen_12']), ctrlKey: false });
    svg.dispatch('mousemove', { target: makePath(['allen_12']), ctrlKey: false });
    svg.dispatch('mouseout', { target: makePath(['allen_12']) });

    assert.deepEqual(calls, [
        ['volumeHover', source, 'coronal'],
        ['highlight', source, 12],
        ['volumeHover', source, 'coronal'],
        ['highlight', source, null],
    ]);
});

test('bindSliceSelection toggles selected regions and ignores root targets', () => {
    const svg = new FakeElement('svg');
    const toggled = [];
    const dispatcher = {
        toggle(source, idx) {
            toggled.push([source, idx]);
        },
    };
    const source = { name: 'slice' };

    bindSliceSelection({
        svg,
        state: { mapping: 'beryl' },
        dispatcher,
        source,
    });

    svg.dispatch('click', { target: makePath(['beryl_22']), ctrlKey: false });
    svg.dispatch('click', { target: makePath(['beryl_region_1', 'beryl_1']), ctrlKey: false });

    assert.deepEqual(toggled, [[source, 22]]);
});
