import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRegionColors, getHemisphereAvailability, normalizeFeatureValue, resolveFeatureRange } from '../../js/core/color-helpers.js';

const colors = Array.from({ length: 100 }, (_, i) => `#${i.toString(16).padStart(2, '0').repeat(3)}`);

test('resolveFeatureRange prefers histogram bounds for selected stats', () => {
    const features = { statistics: { mean: { min: 10, max: 20 } } };
    assert.deepEqual(resolveFeatureRange(features, 'mean', { vmin: 1, vmax: 9 }), { vmin: 1, vmax: 9 });
    assert.deepEqual(resolveFeatureRange(features, 'std', { vmin: 1, vmax: 9 }), { vmin: 0, vmax: 1 });
});

test('getHemisphereAvailability infers left/right presence from feature keys', () => {
    assert.deepEqual(getHemisphereAvailability(['10', '100']), { hasLeft: false, hasRight: true });
    assert.deepEqual(getHemisphereAvailability(['1400']), { hasLeft: true, hasRight: false });
});

test('normalizeFeatureValue applies slider range and optional pseudo-log scaling', () => {
    assert.equal(normalizeFeatureValue(50, 0, 100, 0, 100, false), 50);
    assert.equal(normalizeFeatureValue(50, 0, 100, 0, 100, true), Math.round(100 * Math.pow(0.5, 0.25)));
});

test('buildRegionColors colors present, missing, and null-valued regions consistently', () => {
    const regions = {
        10: { name: 'region right' },
        20: { name: 'region right' },
        1400: { name: 'region left' },
    };
    const features = {
        data: {
            10: { mean: 50 },
            1400: { mean: null },
        },
        statistics: { mean: { min: 0, max: 100 } },
    };
    const result = buildRegionColors({
        regions,
        features,
        stat: 'mean',
        cmin: 0,
        cmax: 100,
        logScale: false,
        colors,
        histogram: null,
    });
    assert.equal(result[10], colors[50]);
    assert.equal(result[20], '#ffffff');
    assert.equal(result[1400], '#d3d3d3');
});

test('buildRegionColors returns null when there is no feature data', () => {
    const result = buildRegionColors({
        regions: { 1: { name: 'region right' } },
        features: null,
        stat: 'mean',
        cmin: 0,
        cmax: 100,
        logScale: false,
        colors,
        histogram: null,
    });
    assert.equal(result, null);
});
