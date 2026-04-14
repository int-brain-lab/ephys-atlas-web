import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildVisibleRegions,
    compareRegionItems,
    getRegionTitle,
    nextSortState,
    searchFilter,
} from '../../js/core/region-helpers.js';

test('searchFilter matches empty search', () => {
    assert.equal(searchFilter('', 'VISp', 'Primary visual area'), true);
});

test('searchFilter matches acronym exact mode', () => {
    assert.equal(searchFilter('acronym=VISp', 'VISp', 'Primary visual area'), true);
    assert.equal(searchFilter('acronym=VISp', 'VISam', 'Visual area AM'), false);
});

test('searchFilter matches partial acronym or name case-insensitively', () => {
    assert.equal(searchFilter('visual', 'VISp', 'Primary visual area'), true);
    assert.equal(searchFilter('vis', 'VISp', 'Primary visual area'), true);
    assert.equal(searchFilter('motor', 'VISp', 'Primary visual area'), false);
});

test('compareRegionItems sorts by idx in unsorted mode', () => {
    const items = [
        { idx: 10, value: 1 },
        { idx: 2, value: 50 },
    ];
    items.sort((a, b) => compareRegionItems(0, a, b));
    assert.deepEqual(items.map((item) => item.idx), [2, 10]);
});

test('compareRegionItems sorts descending for mode 1 and ascending for mode 2', () => {
    const items = [
        { idx: 1, value: 5 },
        { idx: 2, value: 10 },
        { idx: 3, value: 2 },
    ];
    const descending = [...items].sort((a, b) => compareRegionItems(1, a, b));
    const ascending = [...items].sort((a, b) => compareRegionItems(2, a, b));
    assert.deepEqual(descending.map((item) => item.value), [10, 5, 2]);
    assert.deepEqual(ascending.map((item) => item.value), [2, 5, 10]);
});

test('nextSortState cycles through 0, 1, 2', () => {
    assert.equal(nextSortState(0), 1);
    assert.equal(nextSortState(1), 2);
    assert.equal(nextSortState(2), 0);
    assert.equal(nextSortState(undefined), 1);
});

test('buildVisibleRegions filters by search and normalizes feature bars', () => {
    const regions = {
        0: { idx: 10, acronym: 'VISp', name: 'Primary visual area' },
        1: { idx: 20, acronym: 'MOp', name: 'Primary motor area' },
        2: { idx: 30, acronym: 'AUDp', name: 'Primary auditory area' },
    };
    const features = {
        statistics: { mean: { min: 0, max: 100 } },
        data: {
            10: { mean: 50 },
            20: { mean: 0 },
        },
    };
    const kept = buildVisibleRegions(regions, features, 'mean', 'visual');
    assert.deepEqual(Object.keys(kept), ['10']);
    assert.equal(kept[10].normalized, 50);
});

test('buildVisibleRegions keeps plain regions when no feature payload is active', () => {
    const regions = {
        0: { idx: 10, acronym: 'VISp', name: 'Primary visual area' },
    };
    const kept = buildVisibleRegions(regions, null, 'mean', 'visual');
    assert.deepEqual(Object.keys(kept), ['10']);
    assert.equal(kept[10].normalized, undefined);
});

test('getRegionTitle formats selected feature context', () => {
    assert.equal(getRegionTitle('rms_lf', 'mean'), 'rms_lf: mean');
    assert.equal(getRegionTitle('', 'mean'), '');
});
