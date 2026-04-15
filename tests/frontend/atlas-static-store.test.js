import test from 'node:test';
import assert from 'node:assert/strict';

import { AtlasStaticStore } from '../../js/atlas-static-store.js';

function createStore(loaders) {
    const store = new AtlasStaticStore({
        splash: { addTotal() {} },
        urls: {
            colormaps: '/data/json/colormaps.json',
            regions: '/data/json/regions.json',
            slices: (name) => `/data/json/slices_${name}.json`,
        },
    });
    store.loaders = loaders;
    return store;
}

test('getColormap returns stored colors', () => {
    const store = createStore({
        colormaps: { get: (name) => name === 'magma' ? ['#000000', '#ffffff'] : null },
    });

    assert.deepEqual(store.getColormap('magma'), ['#000000', '#ffffff']);
});

test('getRegions preserves current allen leaf filtering', () => {
    const store = createStore({
        regions: {
            get: () => ({
                1: { idx: 10, leaf: true, acronym: 'A' },
                2: { idx: 20, leaf: false, acronym: 'B' },
            }),
        },
    });

    assert.deepEqual(store.getRegions('allen'), {
        10: { idx: 10, leaf: true, acronym: 'A' },
    });
    assert.deepEqual(store.getRegions('beryl'), {
        10: { idx: 10, leaf: true, acronym: 'A' },
        20: { idx: 20, leaf: false, acronym: 'B' },
    });
});

test('getSlice reads the stringified slice index from the matching loader', () => {
    const calls = [];
    const store = createStore({
        slices_coronal: {
            get: (idx) => {
                calls.push(idx);
                return `<svg>${idx}</svg>`;
            },
        },
    });

    assert.equal(store.getSlice('coronal', 12), '<svg>12</svg>');
    assert.deepEqual(calls, ['12']);
});
