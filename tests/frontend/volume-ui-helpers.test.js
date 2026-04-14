import test from 'node:test';
import assert from 'node:assert/strict';

import { buildVolumeVisibilityRules, getVolumeSliderMax, getVolumeSliceIndex } from '../../js/core/volume-ui-helpers.js';

test('buildVolumeVisibilityRules returns overlay rules for visible volume mode', () => {
    assert.deepEqual(buildVolumeVisibilityRules(true), [
        '#svg-coronal-container svg path { fill-opacity: 0%; stroke: #ccc; }\n',
        '#svg-horizontal-container svg path { fill-opacity: 0%; stroke: #ccc; }\n',
        '#svg-sagittal-container svg path { fill-opacity: 0%; stroke: #ccc; }\n',
    ]);
});

test('buildVolumeVisibilityRules returns region and canvas hide rules for non-volume mode', () => {
    assert.deepEqual(buildVolumeVisibilityRules(false), [
        '#svg-coronal-container svg path { fill-opacity: 100%; stroke: #0; }\n',
        '#svg-horizontal-container svg path { fill-opacity: 100%; stroke: #0; }\n',
        '#svg-sagittal-container svg path { fill-opacity: 100%; stroke: #0; }\n',
        '#canvas-coronal { visibility: hidden; }\n',
        '#canvas-horizontal { visibility: hidden; }\n',
        '#canvas-sagittal { visibility: hidden; }\n',
    ]);
});

test('getVolumeSliderMax scales voxel counts by atlas slider convention', () => {
    assert.equal(getVolumeSliderMax(100, 1), 250);
    assert.equal(getVolumeSliderMax(100, 2), 500);
});

test('getVolumeSliceIndex clamps and converts slider values to slice indices', () => {
    assert.equal(getVolumeSliceIndex(0, 1, 20), 0);
    assert.equal(getVolumeSliceIndex(25, 1, 20), 10);
    assert.equal(getVolumeSliceIndex(999, 1, 20), 19);
    assert.equal(getVolumeSliceIndex(50, 2, 20), 10);
    assert.equal(getVolumeSliceIndex(50, 1, 0), 0);
});
