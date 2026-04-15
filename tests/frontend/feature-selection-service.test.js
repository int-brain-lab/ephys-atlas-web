import test from 'node:test';
import assert from 'node:assert/strict';

import { applyFeatureSelection, loadAndSelectFeature } from '../../js/feature-selection-service.js';

test('applyFeatureSelection updates state, dropdown, prefetch, and dispatch', () => {
    const calls = [];
    const state = {
        bucket: 'tmp',
        setFeature(fname, isVolume) {
            this.fname = fname;
            this.isVolume = isVolume;
        },
    };
    const model = {
        scheduleFeaturePrefetch(bucket, fname) { calls.push(['prefetch', bucket, fname]); },
        clearFeaturePrefetch() { calls.push(['clear']); },
    };
    const dispatcher = {
        feature(source, fname, isVolume) { calls.push(['dispatch', source, fname, isVolume]); },
    };
    const dropdown = {
        select(fname) { calls.push(['select', fname]); },
    };
    const source = { id: 'feature' };

    applyFeatureSelection({ state, model, dispatcher, source, dropdown, fname: 'firing_rate', isVolume: false });
    assert.equal(state.fname, 'firing_rate');
    assert.equal(state.isVolume, false);
    assert.deepEqual(calls, [
        ['select', 'firing_rate'],
        ['prefetch', 'tmp', 'firing_rate'],
        ['dispatch', source, 'firing_rate', false],
    ]);
});

test('loadAndSelectFeature resolves volume state from the model when needed', async () => {
    const calls = [];
    const state = {
        bucket: 'tmp',
        mapping: 'allen',
        setFeature(fname, isVolume) {
            this.fname = fname;
            this.isVolume = isVolume;
        },
    };
    const model = {
        async downloadFeatures(bucket, fname, options) { calls.push(['download', bucket, fname, options]); },
        getVolumeData(bucket, fname) { calls.push(['volume', bucket, fname]); return { volumes: {} }; },
        scheduleFeaturePrefetch(bucket, fname) { calls.push(['prefetch', bucket, fname]); },
        clearFeaturePrefetch() { calls.push(['clear']); },
    };
    const dispatcher = {
        feature(_source, fname, isVolume) { calls.push(['dispatch', fname, isVolume]); },
    };
    const dropdown = {
        select(fname) { calls.push(['select', fname]); },
    };

    const result = await loadAndSelectFeature({
        state,
        model,
        dispatcher,
        source: {},
        dropdown,
        fname: 'rms_lf',
        options: { refresh: true },
    });

    assert.deepEqual(result, { fname: 'rms_lf', isVolume: true });
    assert.deepEqual(calls, [
        ['download', 'tmp', 'rms_lf', { refresh: true }],
        ['volume', 'tmp', 'rms_lf'],
        ['select', 'rms_lf'],
        ['prefetch', 'tmp', 'rms_lf'],
        ['dispatch', 'rms_lf', true],
    ]);
});
