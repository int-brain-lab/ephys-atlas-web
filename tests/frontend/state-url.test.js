import test from 'node:test';
import assert from 'node:assert/strict';

import { parseUrlState, serializeStateToUrl, uniqueBuckets } from '../../js/core/state-url.js';

const aliasStates = {
    preset: {
        bucket: 'bwm',
        state: Buffer.from(JSON.stringify({ fname: 'feature_a', mapping: 'beryl' })).toString('base64'),
    },
};

const defaults = {
    aliasStates,
    defaultBucket: 'ephys',
    defaultBuckets: ['ephys', 'bwm', 'local'],
    debug: false,
};

test('uniqueBuckets removes duplicates while preserving order', () => {
    assert.deepEqual(uniqueBuckets(['ephys', 'bwm', 'ephys', 'local']), ['ephys', 'bwm', 'local']);
});

test('parseUrlState merges alias state with default buckets', () => {
    const state = parseUrlState('?alias=preset&buckets=custom,local', defaults);
    assert.equal(state.bucket, 'bwm');
    assert.equal(state.fname, 'feature_a');
    assert.equal(state.mapping, 'beryl');
    assert.deepEqual(state.buckets, ['ephys', 'bwm', 'local', 'custom']);
});

test('parseUrlState clears invalid custom bucket selection', () => {
    const encoded = Buffer.from(JSON.stringify({ bucket: 'missing', fname: 'abc', isVolume: true })).toString('base64');
    const state = parseUrlState(`?state=${encoded}`, defaults);
    assert.equal(state.bucket, null);
    assert.equal(state.fname, null);
    assert.equal(state.isVolume, null);
  });

test('serializeStateToUrl stores custom buckets separately and encodes state', () => {
    const url = serializeStateToUrl({
        bucket: 'custom',
        buckets: ['ephys', 'bwm', 'local', 'custom'],
        fname: 'feature_x',
        mapping: 'allen',
        selected: [1, 2],
    }, {
        currentUrl: 'https://atlas.example.org/?alias=preset',
        defaultBuckets: ['ephys', 'bwm', 'local'],
    });

    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('alias'), null);
    assert.equal(parsed.searchParams.get('bucket'), 'custom');
    assert.equal(parsed.searchParams.get('buckets'), 'custom');
    const decoded = JSON.parse(Buffer.from(parsed.searchParams.get('state'), 'base64').toString('utf8'));
    assert.equal(decoded.fname, 'feature_x');
    assert.equal(decoded.mapping, 'allen');
    assert.deepEqual(decoded.selected, [1, 2]);
    assert.equal(decoded.bucket, undefined);
});
