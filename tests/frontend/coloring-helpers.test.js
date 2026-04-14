import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildRegionColoringView,
    buildRegionColorRules,
    getDefaultRegionColorsHref,
} from '../../js/core/coloring-helpers.js';

test('getDefaultRegionColorsHref derives the mapping-specific CSS path', () => {
    assert.equal(getDefaultRegionColorsHref('allen'), 'data/css/default_region_colors_allen.css');
    assert.equal(getDefaultRegionColorsHref('beryl'), 'data/css/default_region_colors_beryl.css');
});

test('buildRegionColorRules creates one SVG fill rule per region color', () => {
    assert.deepEqual(buildRegionColorRules('allen', {
        10: '#ffffff',
        20: '#123456',
    }), [
        'svg path.allen_region_10 { fill: #ffffff; }\n',
        'svg path.allen_region_20 { fill: #123456; }\n',
    ]);
});

test('buildRegionColorRules returns an empty list when there are no region colors', () => {
    assert.deepEqual(buildRegionColorRules('allen', {}), []);
});

test('buildRegionColoringView groups the render and websocket data for a feature', () => {
    assert.deepEqual(buildRegionColoringView('cosmos', 'firing_rate', {
        3: '#abcdef',
    }), {
        defaultHref: 'data/css/default_region_colors_cosmos.css',
        rules: ['svg path.cosmos_region_3 { fill: #abcdef; }\n'],
        websocketKey: 'firing_rate',
        websocketData: { 3: '#abcdef' },
    });
});
