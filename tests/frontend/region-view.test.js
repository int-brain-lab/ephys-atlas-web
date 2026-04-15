import test from 'node:test';
import assert from 'node:assert/strict';

const { RegionListView } = await import('../../js/region-view.js');

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = tagName.toUpperCase();
        this.listeners = {};
        this.children = [];
        this.attributes = {};
        this.innerHTML = '';
        this.textContent = '';
        this.onclick = null;
    }

    addEventListener(name, callback) {
        this.listeners[name] = callback;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    getAttribute(name) {
        return this.attributes[name] ?? null;
    }

    appendChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) {
            this.children.splice(idx, 1);
        }
        this.children.push(child);
    }
}

function makeListItem(idx, value) {
    return {
        getAttribute(name) {
            if (name === 'data-idx') return String(idx);
            if (name === 'data-value') return String(value);
            return null;
        },
    };
}

test('RegionListView sort button cycles sort state and reorders existing list items', () => {
    const list = new FakeElement('ul');
    list.children = [makeListItem(2, 10), makeListItem(1, 30), makeListItem(3, 20)];
    const sortButton = new FakeElement('button');
    const title = new FakeElement('div');
    const view = new RegionListView({ mapping: 'allen' }, {}, { list, sortButton, title });

    view.list.setAttribute('data-sort-state', 0);
    sortButton.onclick();
    assert.deepEqual(list.children.map((item) => Number(item.getAttribute('data-value'))), [30, 20, 10]);
    assert.equal(sortButton.textContent, '⬇️');

    sortButton.onclick();
    assert.deepEqual(list.children.map((item) => Number(item.getAttribute('data-value'))), [10, 20, 30]);
    assert.equal(sortButton.textContent, '⬆️');
});

test('RegionListView updates title and resets sort icon', () => {
    const list = new FakeElement('ul');
    const sortButton = new FakeElement('button');
    const title = new FakeElement('div');
    const view = new RegionListView({ mapping: 'allen' }, {}, { list, sortButton, title });

    view.setTitle('firing_rate: mean');
    view.resetSort();

    assert.equal(title.innerHTML, 'firing_rate: mean');
    assert.equal(sortButton.innerHTML, '↕️');
});
