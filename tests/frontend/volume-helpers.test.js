import test from 'node:test';
import assert from 'node:assert/strict';

import {
    computeAxisMapping,
    denormalizeVolumeValue,
    getVolumeHoverAxisCoords,
    getVolumePlaneSize,
    hexColorToRgb,
    indexFromAxisCoords,
} from '../../js/core/volume-helpers.js';

const CANONICAL = { coronal: 528, horizontal: 320, sagittal: 456 };
const XY_AXES = {
    coronal: ['sagittal', 'horizontal'],
    horizontal: ['sagittal', 'coronal'],
    sagittal: ['coronal', 'horizontal'],
};

test('hexColorToRgb parses hex strings with or without a leading hash', () => {
    assert.deepEqual(hexColorToRgb('#0a64ff'), [10, 100, 255]);
    assert.deepEqual(hexColorToRgb('112233'), [17, 34, 51]);
});

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

test('indexFromAxisCoords respects raw-axis remapping in C order', () => {
    const shape = [456, 528, 320];
    const rawToAxis = { 0: 'sagittal', 1: 'coronal', 2: 'horizontal' };
    const index = indexFromAxisCoords([7, 9, 11], rawToAxis, shape, false);
    assert.equal(index, 11 * 528 * 320 + 7 * 320 + 9);
});

test('indexFromAxisCoords respects raw-axis remapping in Fortran order', () => {
    const shape = [456, 528, 320];
    const rawToAxis = { 0: 'sagittal', 1: 'coronal', 2: 'horizontal' };
    const index = indexFromAxisCoords([7, 9, 11], rawToAxis, shape, true);
    assert.equal(index, 11 + 456 * (7 + 528 * 9));
});

test('getVolumePlaneSize derives width and height axes for a slice plane', () => {
    assert.deepEqual(getVolumePlaneSize('coronal', CANONICAL, XY_AXES), {
        widthAxis: 'sagittal',
        heightAxis: 'horizontal',
        width: 456,
        height: 320,
        sliceCount: 528,
    });
});

test('getVolumeHoverAxisCoords maps mouse coordinates into axis coordinates', () => {
    const axisCoords = getVolumeHoverAxisCoords(
        'coronal',
        { left: 100, top: 20, width: 200, height: 100 },
        { clientX: 175, clientY: 70 },
        CANONICAL,
        XY_AXES,
        13,
    );
    assert.deepEqual(axisCoords, [13, 160, 171]);
});

test('getVolumeHoverAxisCoords returns null for degenerate rectangles', () => {
    assert.equal(
        getVolumeHoverAxisCoords('coronal', { left: 0, top: 0, width: 0, height: 20 }, { clientX: 1, clientY: 1 }, CANONICAL, XY_AXES, 3),
        null,
    );
});

test('denormalizeVolumeValue expands 0-255 values back into the source bounds', () => {
    assert.equal(denormalizeVolumeValue(0, [10, 20]), 10);
    assert.equal(denormalizeVolumeValue(255, [10, 20]), 20);
    assert.equal(denormalizeVolumeValue(127.5, [10, 20]), 15);
});

test('denormalizeVolumeValue falls back to the raw value when bounds are unusable', () => {
    assert.equal(denormalizeVolumeValue(42, null), 42);
    assert.equal(denormalizeVolumeValue(42, [5, 5]), 42);
    assert.equal(denormalizeVolumeValue(null, [0, 1]), null);
});
