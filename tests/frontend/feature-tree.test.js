import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFeatureDropdownEntries, flattenFeatureTree, flattenFeatureTreeEntries } from '../../js/core/feature-tree.js';

test('flattenFeatureTree returns leaf feature names in nested order', () => {
    const tree = {
        behavior: {
            wheel: 'wheel_speed',
            whisker: 'whisker_motion',
        },
        activity: 'firing_rate',
    };

    assert.deepEqual(flattenFeatureTree(tree), ['wheel_speed', 'whisker_motion', 'firing_rate']);
});

test('flattenFeatureTreeEntries builds dropdown labels from nested groups', () => {
    const tree = {
        behavior: {
            wheel: 'wheel_speed',
        },
        activity: 'firing_rate',
    };

    assert.deepEqual(flattenFeatureTreeEntries(tree), [
        { fname: 'wheel_speed', label: 'behavior / wheel' },
        { fname: 'firing_rate', label: 'activity' },
    ]);
});

test('buildFeatureDropdownEntries falls back to flat feature keys when tree is absent', () => {
    const features = {
        alpha: {},
        beta: {},
    };

    assert.deepEqual(buildFeatureDropdownEntries(null, features), [
        { fname: 'alpha', label: 'alpha' },
        { fname: 'beta', label: 'beta' },
    ]);
});
