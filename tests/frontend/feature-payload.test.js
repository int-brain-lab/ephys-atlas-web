import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getFeatureCmap,
    getFeatureHistogram,
    getFeatureMappingData,
    getFeatureMappings,
    getFeatureVolumeData,
} from '../../js/feature-payload.js';

test('getFeatureMappings preserves the current non-empty-mapping behavior', () => {
    const payload = {
        mappings: {
            allen: { data: { 1: { mean: 0 }, 10: { mean: 1 } } },
            beryl: { data: {} },
        },
    };

    assert.deepEqual(getFeatureMappings(payload), ['allen']);
    assert.equal(getFeatureMappings(null), null);
});

test('payload accessors return cmap, histogram, and mapping data', () => {
    const payload = {
        cmap: 'magma',
        histogram: { vmin: 1, vmax: 9 },
        mappings: {
            allen: { data: { 10: { mean: 1 } }, statistics: { mean: { min: 0, max: 1 } } },
        },
    };

    assert.equal(getFeatureCmap(payload), 'magma');
    assert.deepEqual(getFeatureHistogram(payload), { vmin: 1, vmax: 9 });
    assert.deepEqual(getFeatureMappingData(payload, 'allen'), payload.mappings.allen);
    assert.equal(getFeatureMappingData(payload, 'beryl'), null);
});

test('getFeatureVolumeData returns payload without mutating it', () => {
    const payload = {
        volumes: {
            mean: {
                volume: { shape: [1, 1, 1], fortran_order: false, data: [0] },
            },
        },
    };

    const result = getFeatureVolumeData(payload);
    assert.equal(result, payload);
    assert.equal(Object.hasOwn(payload.volumes, 'is_volume'), false);
    assert.equal(getFeatureVolumeData({}), null);
});
