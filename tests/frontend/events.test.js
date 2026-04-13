import test from 'node:test';
import assert from 'node:assert/strict';

import { EVENTS } from '../../js/core/events.js';

test('EVENTS exposes the expected centralized event names', () => {
    assert.deepEqual(EVENTS, {
        CONNECT: 'connect',
        DATA: 'data',
        SLICE: 'slice',
        HIGHLIGHT: 'highlight',
        VOLUME_HOVER: 'volumeHover',
        VOLUME_VALUES: 'volumeValues',
        HIGHLIGHT_DOT: 'highlightDot',
        TOGGLE: 'toggle',
        TOGGLE_STAT_TOOLBOX: 'toggleStatToolbox',
        CLEAR: 'clear',
        RESET: 'reset',
        BUCKET: 'bucket',
        REFRESH: 'refresh',
        BUCKET_REMOVE: 'bucketRemove',
        SEARCH: 'search',
        SPINNING: 'spinning',
        FEATURE: 'feature',
        FEATURE_HOVER: 'featureHover',
        FEATURE_REMOVE: 'featureRemove',
        STAT: 'stat',
        UNITY_LOADED: 'unityLoaded',
        CMAP: 'cmap',
        LOG_SCALE: 'logScale',
        PANEL: 'panel',
        MAPPING: 'mapping',
        CMAP_RANGE: 'cmapRange',
        SHARE: 'share',
    });
});

test('EVENTS is immutable', () => {
    assert.equal(Object.isFrozen(EVENTS), true);
    assert.throws(() => {
        EVENTS.CONNECT = 'changed';
    }, /Cannot assign to read only property|Cannot set property/);
    assert.equal(EVENTS.CONNECT, 'connect');
});
