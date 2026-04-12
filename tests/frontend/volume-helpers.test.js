import test from 'node:test';
import assert from 'node:assert/strict';

import { computeAxisMapping } from '../../js/core/volume-helpers.js';

const CANONICAL = { coronal: 528, horizontal: 320, sagittal: 456 };

test('computeAxisMapping keeps canonical identity mapping', () => {
    const mapping = computeAxisMapping([528, 320, 456], CANONICAL);
    assert.deepEqual(mapping.axisToRaw, { coronal: 0, horizontal: 1, sagittal: 2 });
    assert.deepEqual(mapping.axisSizes, CANONICAL);
    assert.deepEqual(mapping.downsample, { coronal: 1, horizontal: 1, sagittal: 1 });
});

test('computeAxisMapping infers axis permutation', () => {
    const mapping = computeAxisMapping([456, 528, 320], CANONICAL);
    assert.deepEqual(mapping.axisToRaw, { coronal: 1, horizontal: 2, sagittal: 0 });
    assert.deepEqual(mapping.axisSizes, CANONICAL);
});

test('computeAxisMapping infers integer downsample factors', () => {
    const mapping = computeAxisMapping([264, 160, 228], CANONICAL);
    assert.deepEqual(mapping.axisToRaw, { coronal: 0, horizontal: 1, sagittal: 2 });
    assert.deepEqual(mapping.downsample, { coronal: 2, horizontal: 2, sagittal: 2 });
});

test('computeAxisMapping falls back to identity when no sensible mapping is found', () => {
    const mapping = computeAxisMapping([0, 10, 20], CANONICAL);
    assert.deepEqual(mapping.axisToRaw, { coronal: 0, horizontal: 1, sagittal: 2 });
    assert.deepEqual(mapping.axisSizes, { coronal: 0, horizontal: 10, sagittal: 20 });
    assert.deepEqual(mapping.downsample, { coronal: 1, horizontal: 1, sagittal: 1 });
});
