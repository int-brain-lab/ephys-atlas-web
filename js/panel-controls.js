import { throttle } from './utils.js';
import { EVENTS } from './core/events.js';
import { buildPanelColormapRangeView, getOrderedColormapRange } from './core/panel-helpers.js';

const CMAP_RANGE_THROTTLE = 250;

export class PanelControls {
    constructor({ state, model, dispatcher, elements, source }) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;
        this.elements = elements;
        this.source = source;
    }

    init() {
        this.setupDispatcher();
        this.setupPanelToggle();
        this.setupMapping();
        this.setupStat();
        this.setupColormap();
        this.setupColormapRange();
        this.setupLogScale();
    }

    setState(state) {
        this.setMapping(state.mapping);
        this.setStat(state.stat);
        this.setCmap(state.cmap);
        this.renderColormapRange(this.buildColormapRangeView(state.cmapmin, state.cmapmax));
        this.setLogScale(state.logScale);
        this.setOpen(state.panelOpen);
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.MAPPING, (ev, source) => {
            if (source !== this.source && ev.name) {
                this.elements.imapping.value = ev.name;
            }
        });

        this.dispatcher.on(EVENTS.FEATURE, () => {
            this.syncFeatureControls();
        });
    }

    setOpen(open) {
        if (open) {
            this.elements.el.open = true;
        }
        else {
            this.elements.el.removeAttribute('open');
        }
    }

    setMapping(mapping) {
        this.elements.imapping.value = mapping;
    }

    setStat(stat) {
        this.elements.istat.value = stat;
    }

    setCmap(cmap) {
        this.elements.icmap.value = cmap;
    }

    setLogScale(logScale) {
        this.elements.iclog.checked = logScale;
    }

    getHistogram() {
        return this.model.getFeatureHistogram(this.state.bucket, this.state.fname);
    }

    buildColormapRangeView(cmin, cmax) {
        return buildPanelColormapRangeView(cmin, cmax, this.getHistogram());
    }

    renderColormapRange(view) {
        this.elements.icmapmin.value = view.sliderMin;
        this.elements.icmapmax.value = view.sliderMax;
        this.elements.icmapminInput.value = view.displayMin;
        this.elements.icmapmaxInput.value = view.displayMax;
    }

    updateColormapRange(cmin, cmax) {
        this.state.setCmapRange(cmin, cmax);
        this.dispatcher.cmapRange(this.source, cmin, cmax);
    }

    syncFeatureControls() {
        this.renderColormapRange(this.buildColormapRangeView(this.state.cmapmin, this.state.cmapmax));

        const cmap = this.model.getFeatureColormap(this.state.bucket, this.state.fname);
        if (cmap) {
            this.elements.icmap.value = cmap;
            this.state.setCmap(cmap);
            this.dispatcher.cmap(this.source, cmap);
        }
    }

    setupPanelToggle() {
        this.elements.el.addEventListener('toggle', () => {
            this.state.setPanelOpen(this.elements.el.open);
            this.dispatcher.panel(this.source, { open: this.state.panelOpen });
        });
    }

    setupMapping() {
        this.elements.imapping.addEventListener('change', () => {
            this.state.setMapping(this.elements.imapping.value);
            this.dispatcher.mapping(this.source, this.state.mapping);
        });
    }

    setupStat() {
        this.elements.istat.addEventListener('change', () => {
            this.state.setStat(this.elements.istat.value);
            this.dispatcher.stat(this.source, this.state.stat);
        });
    }

    setupColormap() {
        this.elements.icmap.addEventListener('change', () => {
            this.state.setCmap(this.elements.icmap.value);
            this.dispatcher.cmap(this.source, this.state.cmap);
        });
    }

    setupColormapRange() {
        const onSlider = throttle(() => {
            const [cmin, cmax] = getOrderedColormapRange(this.elements.icmapmin.value, this.elements.icmapmax.value);
            this.updateColormapRange(cmin, cmax);
            this.renderColormapRange(this.buildColormapRangeView(cmin, cmax));
        }, CMAP_RANGE_THROTTLE);

        this.elements.icmapmin.addEventListener('input', onSlider);
        this.elements.icmapmax.addEventListener('input', onSlider);
    }

    setupLogScale() {
        this.elements.iclog.addEventListener('change', (e) => {
            this.state.setLogScale(e.target.checked);
            this.dispatcher.logScale(this.source, this.state.logScale);
        });
    }
}
