import test from 'node:test';
import assert from 'node:assert/strict';

import {
    findClosestPointIndex,
    getMouseRelativePosition,
    getMouseVolumeCoords,
    getPointTriplet,
    projectVolumeCoordsToPixels,
} from '../../js/core/dotimage-helpers.js';

const VOLUME_SIZE = { coronal: 528, horizontal: 320, sagittal: 456 };
const VOLUME_XY_AXES = {
    coronal: ['sagittal', 'horizontal'],
    horizontal: ['sagittal', 'coronal'],
    sagittal: ['coronal', 'horizontal'],
};

test('getMouseRelativePosition clamps coordinates into the visible rectangle', () => {
    assert.deepEqual(
        getMouseRelativePosition({ left: 10, top: 20, width: 200, height: 100 }, { clientX: 260, clientY: 5 }),
        { x: 1, y: 0 },
    );
});

test('getMouseVolumeCoords converts mouse position into ij2xyz inputs', () => {
    const xyz = getMouseVolumeCoords(
        'coronal',
        100,
        { clientX: 110, clientY: 70 },
        { left: 10, top: 20, width: 200, height: 100 },
        VOLUME_SIZE,
        VOLUME_XY_AXES,
        (axis, sliceIdx, i, j) => [axis, sliceIdx, i, j],
    );
    assert.deepEqual(xyz, ['coronal', 100, 228, 160]);
});

test('projectVolumeCoordsToPixels uses axis-specific canvas scaling', () => {
    const xy = projectVolumeCoordsToPixels(
        'horizontal',
        [1, 2, 3],
        { width: 456, height: 528 },
        VOLUME_SIZE,
        () => [228, 264],
    );
    assert.deepEqual(xy, [228, 264]);
});

test('findClosestPointIndex returns the nearest xyz triplet index', () => {
    const points = [0, 0, 0, 10, 0, 0, 5, 5, 0];
    assert.equal(findClosestPointIndex(points, [6, 4, 0]), 2);
});

test('findClosestPointIndex validates point-array structure', () => {
    assert.throws(() => findClosestPointIndex([0, 1], [0, 0, 0]));
    assert.throws(() => findClosestPointIndex([0, 0, 0], [0, 0]));
});

test('getPointTriplet returns the xyz triple for a point index', () => {
    const points = [0, 1, 2, 3, 4, 5];
    assert.deepEqual(getPointTriplet(points, 1), [3, 4, 5]);
    assert.equal(getPointTriplet(points, -1), null);
});
