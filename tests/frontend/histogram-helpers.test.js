import test from 'node:test';
import assert from 'node:assert/strict';

import { BIN_COUNT, computeHistogram, getFeatureHistogram } from '../../js/core/histogram-helpers.js';

test('computeHistogram bins values inside range and excludes upper bound', () => {
    const counts = computeHistogram(5, 0, 10, [0, 1, 1.9, 2, 9.99, 10]);
    assert.deepEqual(counts, [3, 1, 0, 0, 1]);
});

test('getFeatureHistogram sums selected histogram bins and counts', () => {
    const features = {
        data: {
            1: { count: 2, h_000: 1, h_001: 2 },
            2: { count: 3, h_001: 4, h_003: 5 },
            3: { count: 7, h_049: 1 },
        },
    };
    const [histogram, selectedCount] = getFeatureHistogram(features, new Set([1, 2]), BIN_COUNT);
    assert.equal(selectedCount, 5);
    assert.equal(histogram[0], 1);
    assert.equal(histogram[1], 6);
    assert.equal(histogram[3], 5);
    assert.equal(histogram[49], 0);
});

test('getFeatureHistogram returns zeroed histogram when nothing matches', () => {
    const [histogram, selectedCount] = getFeatureHistogram({ data: {} }, new Set([42]), 4);
    assert.deepEqual(histogram, [0, 0, 0, 0]);
    assert.equal(selectedCount, 0);
});
