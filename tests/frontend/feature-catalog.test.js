import test from 'node:test';
import assert from 'node:assert/strict';

import { flattenFeatureTree, getOrderedBucketFeatures, getVolumeFeatureSet } from '../../js/feature-catalog.js';

test('flattenFeatureTree walks nested feature trees in object order', () => {
    const tree = {
        behavior: {
            wheel: 'wheel_speed',
            whisker: 'whisker_motion',
        },
        activity: 'firing_rate',
    };

    assert.deepEqual(flattenFeatureTree(tree), ['wheel_speed', 'whisker_motion', 'firing_rate']);
});

test('getOrderedBucketFeatures prefers tree order and removes duplicates', () => {
    const bucket = {
        metadata: {
            tree: {
                group_a: {
                    first: 'feature_a',
                    second: 'feature_b',
                },
                group_b: {
                    again: 'feature_a',
                    third: 'feature_c',
                },
            },
        },
        features: {
            feature_a: {},
            feature_b: {},
            feature_c: {},
        },
    };

    assert.deepEqual(getOrderedBucketFeatures(bucket), ['feature_a', 'feature_b', 'feature_c']);
});

test('getOrderedBucketFeatures falls back to feature keys when tree is absent', () => {
    const bucket = {
        metadata: {},
        features: {
            alpha: {},
            beta: {},
        },
    };

    assert.deepEqual(getOrderedBucketFeatures(bucket), ['alpha', 'beta']);
});

test('getVolumeFeatureSet returns declared volume features', () => {
    const bucket = {
        metadata: {
            volumes: ['feature_b', 'feature_c'],
        },
    };

    assert.deepEqual(Array.from(getVolumeFeatureSet(bucket)), ['feature_b', 'feature_c']);
    assert.deepEqual(Array.from(getVolumeFeatureSet(null)), []);
});
