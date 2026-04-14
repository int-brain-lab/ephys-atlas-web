import test from 'node:test';
import assert from 'node:assert/strict';

import { Colorbar } from '../../js/colorbar.js';
import { Coloring } from '../../js/coloring.js';
import { Panel } from '../../js/panel.js';
import { Region } from '../../js/region.js';
import { EVENTS } from '../../js/core/events.js';

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = tagName.toUpperCase();
        this.children = [];
        this.style = {};
        this.attributes = new Map();
        this.listeners = new Map();
        this.className = '';
        this.textContent = '';
        this.value = '';
        this.checked = false;
        this.open = false;
        this.href = '';
        this.onclick = null;
        this.sheet = null;
        this.parentNode = null;
        this.classList = {
            add: (...names) => {
                const existing = this.className ? this.className.split(/\s+/) : [];
                for (const name of names) {
                    if (!existing.includes(name)) existing.push(name);
                }
                this.className = existing.join(' ').trim();
            },
        };
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    addEventListener(name, callback) {
        if (!this.listeners.has(name)) {
            this.listeners.set(name, []);
        }
        this.listeners.get(name).push(callback);
    }

    dispatchEvent(event) {
        const listeners = this.listeners.get(event.type) || [];
        for (const listener of listeners) {
            listener(event);
        }
        if (event.type === 'click' && typeof this.onclick === 'function') {
            this.onclick(event);
        }
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.has(name) ? this.attributes.get(name) : null;
    }

    removeAttribute(name) {
        this.attributes.delete(name);
    }

    querySelectorAll(selector) {
        const matches = [];
        const tag = selector.toUpperCase();
        const visit = (node) => {
            for (const child of node.children) {
                if (selector === 'path' && child.tagName === 'PATH') {
                    matches.push(child);
                } else if (child.tagName === tag) {
                    matches.push(child);
                }
                visit(child);
            }
        };
        visit(this);
        return matches;
    }

    cloneNode(deep = false) {
        const clone = new FakeElement(this.tagName);
        clone.className = this.className;
        clone.textContent = this.textContent;
        clone.value = this.value;
        clone.checked = this.checked;
        clone.open = this.open;
        clone.href = this.href;
        clone.sheet = this.sheet;
        clone.innerHTML = this.innerHTML;
        for (const [name, value] of this.attributes.entries()) {
            clone.attributes.set(name, value);
        }
        if (deep) {
            for (const child of this.children) {
                clone.appendChild(child.cloneNode(true));
            }
        }
        return clone;
    }
}

class FakeStyleSheet {
    constructor() {
        this.rules = [];
    }

    insertRule(rule) {
        this.rules.push(rule);
    }

    deleteRule(index) {
        this.rules.splice(index, 1);
    }

    get cssRules() {
        return this.rules.map((cssText) => ({ cssText }));
    }
}

class FakeDocument {
    constructor() {
        this.byId = new Map();
        this.bySelector = new Map();
    }

    registerId(id, element) {
        this.byId.set(id, element);
        return element;
    }

    registerSelector(selector, element) {
        this.bySelector.set(selector, element);
        return element;
    }

    getElementById(id) {
        return this.byId.get(id) || null;
    }

    querySelector(selector) {
        return this.bySelector.get(selector) || null;
    }

    createElement(tagName) {
        return new FakeElement(tagName);
    }

    getElementsByTagName(tagName) {
        const matches = [];
        const upper = tagName.toUpperCase();
        for (const element of this.byId.values()) {
            if (element.tagName === upper) {
                matches.push(element);
            }
        }
        return matches;
    }
    }

class FakeDispatcher {
    constructor() {
        this.handlers = new Map();
        this.dataEvents = [];
        this.cmapEvents = [];
        this.cmapRangeEvents = [];
        this.spinningEvents = [];
        this.panelEvents = [];
        this.resetEvents = [];
        this.shareEvents = 0;
        this.connectEvents = 0;
        this.mappingEvents = [];
        this.statEvents = [];
        this.logScaleEvents = [];
    }

    on(name, callback) {
        if (!this.handlers.has(name)) {
            this.handlers.set(name, []);
        }
        this.handlers.get(name).push(callback);
    }

    emit(name, data = {}, source = null) {
        for (const callback of this.handlers.get(name) || []) {
            callback(data, source);
        }
    }

    data(source, name, key, data) {
        this.dataEvents.push({ source, name, key, data });
    }

    cmap(source, name) {
        this.cmapEvents.push({ source, name });
    }

    cmapRange(source, cmin, cmax) {
        this.cmapRangeEvents.push({ source, cmin, cmax });
    }

    spinning(source, isSpinning) {
        this.spinningEvents.push({ source, isSpinning });
    }

    panel(source, data) {
        this.panelEvents.push({ source, data });
    }

    reset(source) {
        this.resetEvents.push({ source });
    }

    share() {
        this.shareEvents += 1;
    }

    connect() {
        this.connectEvents += 1;
    }

    mapping(source, name) {
        this.mappingEvents.push({ source, name });
    }

    stat(source, name) {
        this.statEvents.push({ source, name });
    }

    logScale(source, checked) {
        this.logScaleEvents.push({ source, checked });
    }

    highlight() {}
    toggle() {}
}

function installTestDom() {
    const document = new FakeDocument();

    document.registerId('mini-histogram', new FakeElement('div'));
    document.registerId('style-default-regions', new FakeElement('link'));
    const styleElement = new FakeElement('style');
    styleElement.sheet = new FakeStyleSheet();
    document.registerId('style-regions', styleElement);

    document.registerId('mapping-dropdown', new FakeElement('select'));
    document.registerId('feature-dropdown', new FakeElement('select'));
    document.registerId('bucket-dropdown', new FakeElement('select'));
    document.registerId('colormap-dropdown', new FakeElement('select'));
    document.registerId('stat-dropdown', new FakeElement('select'));
    document.registerId('colormap-min', new FakeElement('input'));
    document.registerId('colormap-max', new FakeElement('input'));
    document.registerId('colormap-min-input', new FakeElement('input'));
    document.registerId('colormap-max-input', new FakeElement('input'));
    document.registerId('log-scale', new FakeElement('input'));
    document.registerId('reset-view-button', new FakeElement('button'));
    document.registerId('clear-cache-button', new FakeElement('button'));
    document.registerId('connect-button', new FakeElement('button'));
    document.registerId('export-button', new FakeElement('button'));
    document.registerId('share-button', new FakeElement('button'));

    document.registerId('bar-plot-list', new FakeElement('ul'));
    document.registerId('bar-plot-sort', new FakeElement('button'));
    document.registerId('bar-plot-title', new FakeElement('div'));

    document.registerSelector('#control-panel details', new FakeElement('details'));

    const previousDocument = globalThis.document;
    globalThis.document = document;
    return {
        document,
        restore() {
            globalThis.document = previousDocument;
        },
    };
}

function createModelStub() {
    const histogram = {
        vmin: -96.0625,
        vmax: 0,
        total_count: 123,
        counts: [1, 2, 3, 4],
    };
    const regions = {
        0: { idx: 10, acronym: 'VISp', name: 'Primary visual area' },
        1: { idx: 20, acronym: 'MOp', name: 'Primary motor area' },
    };
    const features = {
        statistics: { mean: { min: 0, max: 100 } },
        data: {
            10: { mean: 50 },
            20: { mean: 10 },
        },
    };
    return {
        getHistogram() {
            return histogram;
        },
        getVolumeData() {
            return { volumes: { mean: { volume: { bounds: [-1, 1] } } } };
        },
        getFeatures() {
            return features;
        },
        getRegions() {
            return regions;
        },
        getColormap() {
            return Array.from({ length: 100 }, (_, idx) => `#${idx.toString(16).padStart(6, '0')}`);
        },
        getCmap() {
            return 'viridis';
        },
        getColors() {
            return {
                10: '#112233',
                20: '#445566',
            };
        },
        getFeaturesMappings() {
            return ['allen'];
        },
    };
}

test('feature selection keeps panel and colorbar range in sync for volume features', () => {
    const { document, restore } = installTestDom();
    try {
        const state = {
            bucket: 'tmp',
            fname: 'rms_lf',
            isVolume: true,
            mapping: 'allen',
            stat: 'mean',
            cmap: 'magma',
            cmapmin: 0,
            cmapmax: 100,
            logScale: false,
            panelOpen: false,
            selected: new Set(),
            setCmapRange(cmin, cmax) {
                this.cmapmin = cmin;
                this.cmapmax = cmax;
            },
            setPanelOpen(open) {
                this.panelOpen = open;
            },
            reset() {},
        };
        const model = createModelStub();
        const dispatcher = new FakeDispatcher();

        const panel = new Panel(state, model, dispatcher);
        const colorbar = new Colorbar(state, model, dispatcher);

        dispatcher.emit(EVENTS.FEATURE, { fname: 'rms_lf', isVolume: true });

        assert.equal(document.getElementById('colormap-min-input').value, '-96.0625');
        assert.equal(document.getElementById('colormap-max-input').value, '0');
        assert.equal(document.getElementById('colormap-dropdown').value, 'viridis');
        assert.deepEqual(dispatcher.cmapEvents.at(-1)?.name, 'viridis');

        assert.equal(colorbar.miniHistogram.featureMin.innerHTML, '-96.0625');
        assert.equal(colorbar.miniHistogram.featureMax.innerHTML, '0');
        assert.equal(colorbar.miniHistogram.countTotal.innerHTML, 'n<sub>total</sub>=123');
    } finally {
        restore();
    }
});

test('non-volume feature selection updates coloring rules and region list together', async () => {
    const { document, restore } = installTestDom();
    try {
        const state = {
            bucket: 'tmp',
            fname: 'firing_rate',
            isVolume: false,
            mapping: 'allen',
            stat: 'mean',
            cmap: 'magma',
            cmapmin: 0,
            cmapmax: 100,
            logScale: false,
            search: 'visual',
            panelOpen: false,
            selected: new Set(),
            setMapping(mapping) {
                this.mapping = mapping;
            },
        };
        const model = createModelStub();
        const dispatcher = new FakeDispatcher();

        const coloring = new Coloring(state, model, dispatcher);
        const region = new Region(state, model, dispatcher);

        dispatcher.emit(EVENTS.FEATURE, { fname: 'firing_rate', isVolume: false });
        await region.setRegions();

        const rules = document.getElementById('style-regions').sheet.rules;
        assert.deepEqual(rules, [
            'svg path.allen_region_10 { fill: #112233; }\n',
            'svg path.allen_region_20 { fill: #445566; }\n',
        ]);

        const lastDataEvent = dispatcher.dataEvents.at(-1);
        assert.equal(lastDataEvent.name, 'regionValues');
        assert.equal(document.getElementById('bar-plot-title').innerHTML, 'firing_rate: mean');
        assert.match(document.getElementById('bar-plot-list').innerHTML, /VISp/);
        assert.doesNotMatch(document.getElementById('bar-plot-list').innerHTML, /MOp/);
    } finally {
        restore();
    }
});
