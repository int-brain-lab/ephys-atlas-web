import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getCoronalGuideState,
    getHorizontalGuideState,
    getNextSliceSliderValue,
    getSagittalGuideState,
    getSliceWheelStep,
    isRootTarget,
} from '../../js/core/slice-helpers.js';

test('isRootTarget only matches the configured root class', () => {
    const rootTarget = { classList: { contains: (name) => name === 'beryl_region_1' } };
    const otherTarget = { classList: { contains: () => false } };
    assert.equal(isRootTarget(rootTarget), true);
    assert.equal(isRootTarget(otherTarget), false);
    assert.equal(isRootTarget(null), false);
});

test('getSliceWheelStep preserves the touchpad workaround on macOS', () => {
    assert.equal(getSliceWheelStep('macOS'), 4);
    assert.equal(getSliceWheelStep('Linux'), 24);
});

test('getNextSliceSliderValue applies wheel direction and clamps to slider bounds', () => {
    assert.equal(getNextSliceSliderValue(100, -1, 200, 'macOS'), 104);
    assert.equal(getNextSliceSliderValue(100, 1, 200, 'Linux'), 76);
    assert.equal(getNextSliceSliderValue(3, 1, 200, 'macOS'), 0);
    assert.equal(getNextSliceSliderValue(199, -1, 200, 'Linux'), 200);
    assert.equal(getNextSliceSliderValue(50, 0, 200, 'Linux'), 50);
});

test('getSagittalGuideState returns line positions and ML label', () => {
    assert.deepEqual(getSagittalGuideState(570, 1140), {
        topX: 236,
        coronalX: 237,
        horizontalX: 237,
        ml: -39,
    });
});

test('getCoronalGuideState returns line positions and AP label', () => {
    assert.deepEqual(getCoronalGuideState(660, 1320), {
        topY: 174,
        sagittalX: 236,
        horizontalY: 174,
        ap: -1200,
    });
});

test('getHorizontalGuideState returns line positions and DV label', () => {
    assert.deepEqual(getHorizontalGuideState(400, 800), {
        coronalY: 174,
        sagittalY: 174,
        dv: -3668,
    });
});

test('guide helpers clamp sagittal and coronal indices away from the edges', () => {
    assert.equal(getSagittalGuideState(0, 1140).ml, -5639);
    assert.equal(getCoronalGuideState(0, 1320).ap, 5300);
});
