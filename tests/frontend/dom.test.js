import test from 'node:test';
import assert from 'node:assert/strict';

import { getRequiredElement, getRequiredSelector, getRequiredSheet } from '../../js/core/dom.js';

test('getRequiredElement returns an element from getElementById', () => {
    const expected = { id: 'share-button' };
    const root = {
        getElementById(id) {
            return id === 'share-button' ? expected : null;
        },
    };

    assert.equal(getRequiredElement('share-button', root), expected);
});

test('getRequiredElement falls back to querySelector when getElementById is unavailable', () => {
    const expected = { id: 'fallback' };
    const root = {
        querySelector(selector) {
            return selector === '#fallback' ? expected : null;
        },
    };

    assert.equal(getRequiredElement('fallback', root), expected);
});

test('getRequiredElement throws a clear error when the element is missing', () => {
    const root = {
        getElementById() {
            return null;
        },
    };

    assert.throws(() => getRequiredElement('missing', root), /Missing required DOM element #missing/);
});

test('getRequiredSelector returns a matched element and throws when absent', () => {
    const expected = { className: 'panel' };
    const root = {
        querySelector(selector) {
            return selector === '.panel' ? expected : null;
        },
    };

    assert.equal(getRequiredSelector('.panel', root), expected);
    assert.throws(() => getRequiredSelector('.missing', root), /Missing required DOM element matching \.missing/);
});

test('getRequiredSheet returns the stylesheet sheet and throws when it is unavailable', () => {
    const sheet = { insertRule() {} };
    const root = {
        getElementById(id) {
            if (id === 'style-regions') {
                return { sheet };
            }
            if (id === 'style-empty') {
                return { sheet: null };
            }
            return null;
        },
    };

    assert.equal(getRequiredSheet('style-regions', root), sheet);
    assert.throws(() => getRequiredSheet('style-empty', root), /Missing stylesheet sheet for #style-empty/);
});
