import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = {
    hostname: 'localhost',
    search: '?alias=bwm',
    toString() {
        return 'https://atlas.example.org/?alias=bwm';
    },
};

globalThis.window = {
    location: globalThis.location,
    history: {
        calls: [],
        replaceState(_state, _title, url) {
            this.calls.push(url);
        },
    },
};

const { loadStateFromUrl, replaceBrowserUrl, serializeAppStateToUrl } = await import('../../js/state-router.js');

test('loadStateFromUrl reads from browser location by default', () => {
    const state = loadStateFromUrl({ debug: false });
    assert.equal(state.bucket, 'bwm');
    assert.deepEqual(state.buckets, ['ephys', 'bwm', 'local']);
});

test('serializeAppStateToUrl omits internal state fields and serializes selected', () => {
    const url = serializeAppStateToUrl({
        _toggle: false,
        bucket: 'custom',
        buckets: ['ephys', 'bwm', 'local', 'custom'],
        fname: 'feature_x',
        mapping: 'allen',
        selected: new Set([1, 2]),
    }, {
        currentUrl: 'https://atlas.example.org/?alias=bwm',
    });

    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('bucket'), 'custom');
    assert.equal(parsed.searchParams.get('buckets'), 'custom');
    const decoded = JSON.parse(Buffer.from(parsed.searchParams.get('state'), 'base64').toString('utf8'));
    assert.deepEqual(decoded.selected, [1, 2]);
    assert.equal(decoded._toggle, undefined);
});

test('replaceBrowserUrl writes through history.replaceState', () => {
    const url = 'https://atlas.example.org/?bucket=ephys&state=abc';
    assert.equal(replaceBrowserUrl(url), url);
    assert.equal(globalThis.window.history.calls.at(-1), url);
});
