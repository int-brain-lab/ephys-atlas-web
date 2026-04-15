import test from 'node:test';
import assert from 'node:assert/strict';

import { cloneSvgAndSetFillColors } from '../../js/panel-export.js';

class FakePath {
    constructor(fill = '') {
        this.style = { fill };
    }
}

class FakeSvg {
    constructor(paths) {
        this.paths = paths;
    }

    querySelectorAll(selector) {
        assert.equal(selector, 'path');
        return this.paths;
    }

    cloneNode() {
        return new FakeSvg(this.paths.map(() => new FakePath()));
    }
}

test('cloneSvgAndSetFillColors copies computed fill colors onto the clone', () => {
    const original = new FakeSvg([new FakePath(), new FakePath()]);
    const fills = ['rgb(1, 2, 3)', 'rgb(4, 5, 6)'];
    const clone = cloneSvgAndSetFillColors(original, (path) => ({
        fill: fills[original.paths.indexOf(path)],
    }));

    assert.notEqual(clone, original);
    assert.deepEqual(clone.paths.map((path) => path.style.fill), fills);
});
