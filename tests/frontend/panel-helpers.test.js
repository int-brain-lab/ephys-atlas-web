import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildClearedStateUrl,
    buildPanelColormapRangeView,
    fromHistogramValueRange,
    getOrderedColormapRange,
    toHistogramValueRange,
} from '../../js/core/panel-helpers.js';

test('toHistogramValueRange converts slider percentages into histogram values', () => {
    assert.deepEqual(toHistogramValueRange(25, 75, { vmin: 10, vmax: 30 }), [15, 25]);
});

test('fromHistogramValueRange converts histogram values back into slider percentages', () => {
    assert.deepEqual(fromHistogramValueRange(15, 25, { vmin: 10, vmax: 30 }), [25, 75]);
});

test('panel histogram helpers preserve negative-to-zero ranges', () => {
    assert.deepEqual(toHistogramValueRange(0, 100, { vmin: -96.0625, vmax: 0 }), [-96.0625, 0]);
    assert.deepEqual(fromHistogramValueRange(-96.0625, 0, { vmin: -96.0625, vmax: 0 }), [0, 100]);
});

test('panel histogram range helpers return zeros when histogram data is missing', () => {
    assert.deepEqual(toHistogramValueRange(25, 75, null), [0, 0]);
    assert.deepEqual(fromHistogramValueRange(15, 25, null), [0, 0]);
});

test('getOrderedColormapRange normalizes slider order', () => {
    assert.deepEqual(getOrderedColormapRange(80, 20), [20, 80]);
    assert.deepEqual(getOrderedColormapRange(10, 10), [10, 10]);
});

test('buildPanelColormapRangeView groups slider and display values', () => {
    assert.deepEqual(buildPanelColormapRangeView(0, 100, { vmin: -96.0625, vmax: 0 }), {
        sliderMin: 0,
        sliderMax: 100,
        displayMin: '-96.0625',
        displayMax: '0',
    });
});

test('buildPanelColormapRangeView handles missing histogram data', () => {
    assert.deepEqual(buildPanelColormapRangeView(25, 75, null), {
        sliderMin: 25,
        sliderMax: 75,
        displayMin: '0',
        displayMax: '0',
    });
});

test('buildClearedStateUrl preserves the page and clears the state query param', () => {
    assert.equal(
        buildClearedStateUrl('https://localhost:8456/?bucket=test&state=abc#hash'),
        'https://localhost:8456/?bucket=test&state=#hash',
    );
});
