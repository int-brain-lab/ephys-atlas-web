import test from 'node:test';
import assert from 'node:assert/strict';

import { Colorbar } from '../../js/colorbar.js';
import { Coloring } from '../../js/coloring.js';
import { Panel } from '../../js/panel.js';
import { Region } from '../../js/region.js';
import { Share } from '../../js/share.js';
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
        this.width = 0;
        this.height = 0;
        this.innerHTML = '';
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

    getContext(kind) {
        if (kind !== '2d') {
            return null;
        }
        return {
            createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
            putImageData() {},
            drawImage() {},
        };
    }

    getBoundingClientRect() {
        return this.boundingRect || { left: 0, top: 0, width: 100, height: 100 };
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

    volumeValues(source, axis, values, e) {
        this.emit(EVENTS.VOLUME_VALUES, { axis, values, e }, source);
    }

    highlight() {}
    toggle() {}
}

function installTestDom() {
    const document = new FakeDocument();

    document.registerId('mini-histogram', new FakeElement('div'));
    document.registerId('region-info', new FakeElement('div'));
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

    document.registerId('style-volume', Object.assign(new FakeElement('style'), { sheet: new FakeStyleSheet() }));

    for (const axis of ['coronal', 'horizontal', 'sagittal']) {
        const container = new FakeElement('div');
        container.boundingRect = { left: 0, top: 0, width: 100, height: 100 };
        document.registerId(`svg-${axis}-container-inner`, container);

        const svg = new FakeElement('svg');
        svg.setAttribute('viewBox', '0 0 2 2');
        document.registerId(`svg-${axis}`, svg);

        document.registerId(`canvas-${axis}`, new FakeElement('canvas'));
        document.registerId(`slider-${axis}`, new FakeElement('input'));
    }

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

function installTestWindow() {
    const historyCalls = [];
    const clipboardWrites = [];
    const previousWindow = globalThis.window;
    const previousLocation = globalThis.location;
    const previousNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const previousSetTimeout = globalThis.setTimeout;

    const windowStub = {
        history: {
            pushState(_state, _title, url) {
                historyCalls.push(url);
            },
            replaceState(_state, _title, url) {
                historyCalls.push(url);
            },
        },
        location: {
            href: 'https://localhost:8456/?bucket=tmp&state=abc',
            toString() {
                return this.href;
            },
        },
        confirm() {
            return true;
        },
    };

    globalThis.window = windowStub;
    globalThis.location = windowStub.location;
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        writable: true,
        value: {
            clipboard: {
                writeText(value) {
                    clipboardWrites.push(String(value));
                },
            },
        },
    });
    globalThis.setTimeout = (fn) => {
        fn();
        return 0;
    };

    return {
        historyCalls,
        clipboardWrites,
        restore() {
            globalThis.window = previousWindow;
            globalThis.location = previousLocation;
            if (previousNavigatorDescriptor) {
                Object.defineProperty(globalThis, 'navigator', previousNavigatorDescriptor);
            } else {
                delete globalThis.navigator;
            }
            globalThis.setTimeout = previousSetTimeout;
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

test('panel reset and share update URL state consistently', () => {
    const { document, restore } = installTestDom();
    const windowEnv = installTestWindow();
    try {
        const state = {
            bucket: 'tmp',
            buckets: ['tmp', 'local'],
            fname: 'firing_rate',
            isVolume: false,
            mapping: 'allen',
            stat: 'mean',
            cmap: 'magma',
            cmapmin: 25,
            cmapmax: 75,
            logScale: true,
            search: '',
            panelOpen: true,
            selected: new Set([10]),
            coronal: 660,
            sagittal: 550,
            horizontal: 400,
            exploded: 0,
            resetCalls: 0,
            reset() {
                this.resetCalls += 1;
                this.fname = '';
                this.isVolume = null;
                this.cmap = 'magma';
                this.cmapmin = 0;
                this.cmapmax = 100;
                this.logScale = false;
            },
            setCmapRange(cmin, cmax) {
                this.cmapmin = cmin;
                this.cmapmax = cmax;
            },
            setPanelOpen(open) {
                this.panelOpen = open;
            },
            updateURLCalls: 0,
            updateURL() {
                this.updateURLCalls += 1;
                return 'https://localhost:8456/?bucket=tmp&state=serialized';
            },
        };
        const model = createModelStub();
        const dispatcher = new FakeDispatcher();

        const panel = new Panel(state, model, dispatcher);
        const share = new Share(state, model, dispatcher);

        panel.resetView();
        assert.equal(state.resetCalls, 1);
        assert.equal(dispatcher.resetEvents.length, 1);
        assert.equal(document.getElementById('colormap-min').value, 0);
        assert.equal(document.getElementById('colormap-max').value, 100);
        assert.equal(windowEnv.historyCalls.at(-1), 'https://localhost:8456/?bucket=tmp&state=');

        dispatcher.emit(EVENTS.SHARE, {});
        assert.equal(state.updateURLCalls, 1);
        assert.equal(windowEnv.clipboardWrites.at(-1), 'https://localhost:8456/?bucket=tmp&state=serialized');
        assert.equal(document.getElementById('share-button').innerHTML, 'share');
    } finally {
        windowEnv.restore();
        restore();
    }
});

test('volume hover publishes denormalized bounds-based values to the tooltip', async () => {
    const { document, restore } = installTestDom();
    const windowEnv = installTestWindow();
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
            coronal: 0,
            horizontal: 0,
            sagittal: 0,
        };
        const model = {
            getVolumeData() {
                return {
                    volumes: {
                        mean: {
                            bounds: [-96.0625, 0],
                            volume: {
                                shape: [2, 2, 2],
                                fortran_order: false,
                                data: new Uint8Array([0, 0, 255, 0, 0, 0, 0, 0]),
                                bounds: new Float32Array([0, 0]),
                            },
                        },
                    },
                };
            },
            getColormap() {
                return Array.from({ length: 100 }, () => '#111111');
            },
            getRegions() {
                return {};
            },
        };
        const dispatcher = new FakeDispatcher();

        const { Volume } = await import('../../js/volume.js');
        const { Tooltip } = await import('../../js/tooltip.js');
        new Volume(state, model, dispatcher);
        new Tooltip(state, model, dispatcher);

        dispatcher.emit(EVENTS.FEATURE, { fname: 'rms_lf', isVolume: true });
        dispatcher.emit(EVENTS.VOLUME_HOVER, {
            axis: 'coronal',
            e: { clientX: 25, clientY: 75 },
        });

        assert.equal(document.getElementById('region-info').innerHTML, 'mean: 0');
        assert.equal(document.getElementById('region-info').style.visibility, 'visible');
        assert.equal(document.getElementById('region-info').style.left, '35px');
        assert.equal(document.getElementById('region-info').style.top, '85px');
    } finally {
        windowEnv.restore();
        restore();
    }
});
