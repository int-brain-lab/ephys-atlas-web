import test from 'node:test';
import assert from 'node:assert/strict';

import { FeatureDropdown } from '../../js/feature-dropdown.js';

class FakeOption {
    constructor() {
        this.value = '';
        this.textContent = '';
        this.title = '';
    }
}

class FakeSelect {
    constructor() {
        this.children = [];
        this.value = '';
        this.innerHTML = '';
        this.disabled = false;
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    get options() {
        return this.children;
    }
}

const fakeDocument = {
    createElement(tagName) {
        assert.equal(tagName, 'option');
        return new FakeOption();
    },
};

test('FeatureDropdown renders placeholder, labels, and suppresses dimensionless units', () => {
    const select = new FakeSelect();
    const dropdown = new FeatureDropdown(select, fakeDocument);
    dropdown.setFeatures({
        wheel_speed: { short_desc: 'Wheel speed', unit: 'cm/s' },
        cor_ratio: { short_desc: 'Correlation ratio', unit: 'dimensionless' },
    }, {
        behavior: { wheel: 'wheel_speed' },
        quality: 'cor_ratio',
    });

    assert.equal(select.children.length, 3);
    assert.equal(select.children[0].textContent, 'Select a feature');
    assert.equal(select.children[1].textContent, 'behavior / wheel');
    assert.equal(select.children[1].title, 'Wheel speed\nUnit: cm/s');
    assert.equal(select.children[2].textContent, 'quality');
    assert.equal(select.children[2].title, 'Correlation ratio');
    assert.equal(select.disabled, false);
});

test('FeatureDropdown selection falls back to empty when option is missing', () => {
    const select = new FakeSelect();
    const dropdown = new FeatureDropdown(select, fakeDocument);
    dropdown.setFeatures({ alpha: {} }, null);

    dropdown.select('alpha');
    assert.equal(dropdown.selected('alpha'), true);

    dropdown.select('missing');
    assert.equal(select.value, '');
});
