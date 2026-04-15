import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFeaturePrefetchPlan, buildPrefetchList } from '../../js/feature-prefetch-policy.js';

test('buildPrefetchList alternates forward and backward from the selected feature', () => {
    const ordered = ['a', 'b', 'c', 'd', 'e'];
    assert.deepEqual(buildPrefetchList(ordered, 'c'), ['d', 'b', 'e', 'a']);
    assert.deepEqual(buildPrefetchList(ordered, 'missing'), ['a', 'b', 'c', 'd', 'e']);
});

test('buildFeaturePrefetchPlan filters non-volume candidates for non-volume selections', () => {
    const plan = buildFeaturePrefetchPlan({
        bucket: 'ephys',
        fname: 'b',
        orderedFeatures: ['a', 'b', 'c', 'd'],
        volumeFeatures: new Set(['d']),
        hasFeature: (candidate) => candidate === 'a',
        hasRawVolumeResponse: () => false,
    });

    assert.deepEqual(plan.rawVolumeTasks, [{ bucket: 'ephys', fname: 'd' }]);
    assert.deepEqual(plan.tasks, [{ bucket: 'ephys', fname: 'c' }]);
});

test('buildFeaturePrefetchPlan limits prefetch to two volume candidates for volume selections', () => {
    const plan = buildFeaturePrefetchPlan({
        bucket: 'ephys',
        fname: 'c',
        orderedFeatures: ['a', 'b', 'c', 'd', 'e', 'f'],
        volumeFeatures: new Set(['b', 'c', 'd', 'e', 'f']),
        hasFeature: () => false,
        hasRawVolumeResponse: (candidate) => candidate === 'f',
    });

    assert.deepEqual(plan.rawVolumeTasks, [
        { bucket: 'ephys', fname: 'b' },
        { bucket: 'ephys', fname: 'd' },
        { bucket: 'ephys', fname: 'e' },
    ]);
    assert.deepEqual(plan.tasks, [
        { bucket: 'ephys', fname: 'd' },
        { bucket: 'ephys', fname: 'b' },
    ]);
});
