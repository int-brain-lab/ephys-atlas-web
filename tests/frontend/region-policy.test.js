import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCompatibleMappingForFeature } from '../../js/region-policy.js';

test('resolveCompatibleMappingForFeature keeps current mapping when it is supported', () => {
    assert.equal(resolveCompatibleMappingForFeature({
        isVolume: false,
        currentMapping: 'allen',
        mappings: ['allen', 'beryl'],
    }), null);
});

test('resolveCompatibleMappingForFeature picks the first supported mapping when current mapping is missing', () => {
    assert.equal(resolveCompatibleMappingForFeature({
        isVolume: false,
        currentMapping: 'beryl',
        mappings: ['allen', 'cosmos'],
    }), 'allen');
});

test('resolveCompatibleMappingForFeature never forces a switch for volume features', () => {
    assert.equal(resolveCompatibleMappingForFeature({
        isVolume: true,
        currentMapping: 'beryl',
        mappings: ['allen'],
    }), null);
});
