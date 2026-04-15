import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { hostname: 'localhost' };

const { normalizeAppState } = await import('../../js/core/state-normalize.js');

test('normalizeAppState applies defaults and converts selected to a Set', () => {
    const state = normalizeAppState({});

    assert.equal(state.bucket, 'ephys');
    assert.deepEqual(state.buckets, ['ephys', 'bwm', 'local']);
    assert.equal(state.cmap, 'magma');
    assert.equal(state.stat, 'mean');
    assert.equal(state.mapping, 'allen');
    assert.equal(state.coronal, 660);
    assert.equal(state.sagittal, 550);
    assert.equal(state.horizontal, 400);
    assert.deepEqual(Array.from(state.selected), []);
    assert.ok(state.selected instanceof Set);
});

test('normalizeAppState preserves provided values and coerces slice indices', () => {
    const state = normalizeAppState({
        bucket: 'custom',
        buckets: ['ephys', 'custom'],
        fname: 'feature_x',
        isVolume: true,
        stat: 'median',
        mapping: 'beryl',
        cmap: 'viridis',
        cmapmin: 5,
        cmapmax: 95,
        logScale: true,
        coronal: '123',
        sagittal: '456',
        horizontal: '789',
        exploded: '1.5',
        highlighted: 42,
        selected: [1, 2],
        panelOpen: true,
    });

    assert.equal(state.bucket, 'custom');
    assert.deepEqual(state.buckets, ['ephys', 'custom']);
    assert.equal(state.fname, 'feature_x');
    assert.equal(state.isVolume, true);
    assert.equal(state.stat, 'median');
    assert.equal(state.mapping, 'beryl');
    assert.equal(state.cmap, 'viridis');
    assert.equal(state.cmapmin, 5);
    assert.equal(state.cmapmax, 95);
    assert.equal(state.logScale, true);
    assert.equal(state.coronal, 123);
    assert.equal(state.sagittal, 456);
    assert.equal(state.horizontal, 789);
    assert.equal(state.exploded, 1.5);
    assert.equal(state.highlighted, 42);
    assert.deepEqual(Array.from(state.selected), [1, 2]);
    assert.equal(state.panelOpen, true);
});
