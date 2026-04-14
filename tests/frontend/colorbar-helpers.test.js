import test from 'node:test';
import assert from 'node:assert/strict';

import {
    collectRegionStatValues,
    resolveColorbarRange,
    resolveGlobalHistogramCounts,
} from '../../js/core/colorbar-helpers.js';

test('collectRegionStatValues gathers non-null per-region stats and tracks range', () => {
    const result = collectRegionStatValues(
        { 1: {}, 2: {}, 3: {} },
        { data: { 1: { mean: -2 }, 2: { mean: 5 }, 3: { mean: null } } },
        'mean',
    );
    assert.deepEqual(result, { values: [-2, 5], vmin: -2, vmax: 5 });
});

test('resolveColorbarRange prefers histogram metadata', () => {
    assert.deepEqual(
        resolveColorbarRange({ vmin: -96.0625, vmax: 0, total_count: 10 }, { volumes: { mean: { volume: { bounds: [1, 2] } } } }),
        { vmin: -96.0625, vmax: 0, totalCount: 10 },
    );
});

test('resolveColorbarRange falls back to volume bounds', () => {
    assert.deepEqual(
        resolveColorbarRange(null, { volumes: { mean: { volume: { bounds: [-10, 4] } } } }),
        { vmin: -10, vmax: 4, totalCount: null },
    );
});

test('resolveGlobalHistogramCounts prefers stored histogram counts', () => {
    assert.deepEqual(
        resolveGlobalHistogramCounts({ counts: [1, 2, 3] }, false, {}, null, 'mean'),
        [1, 2, 3],
    );
});

test('resolveGlobalHistogramCounts recomputes non-volume histograms from region values', () => {
    const counts = resolveGlobalHistogramCounts(
        null,
        false,
        { 1: {}, 2: {}, 3: {} },
        { data: { 1: { mean: 0 }, 2: { mean: 5 }, 3: { mean: 9.99 } } },
        'mean',
        5,
    );
    assert.deepEqual(counts, [1, 0, 1, 0, 0]);
});

test('resolveGlobalHistogramCounts returns null for volume fallback or degenerate ranges', () => {
    assert.equal(resolveGlobalHistogramCounts(null, true, {}, null, 'mean'), null);
    assert.equal(
        resolveGlobalHistogramCounts(null, false, { 1: {} }, { data: { 1: { mean: 2 } } }, 'mean', 5),
        null,
    );
});
