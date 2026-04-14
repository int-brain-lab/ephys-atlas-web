import test from 'node:test';
import assert from 'node:assert/strict';

import { toHistogramValueRange, fromHistogramValueRange } from '../../js/core/panel-helpers.js';

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
