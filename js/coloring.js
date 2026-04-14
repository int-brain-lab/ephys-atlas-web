export { Coloring };

import { clearStyle } from "./utils.js";
import { EVENTS } from "./core/events.js";
import { getRequiredElement, getRequiredSheet } from "./core/dom.js";
import {
    buildRegionColoringView,
    getDefaultRegionColorsHref,
} from "./core/coloring-helpers.js";

class Coloring {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.style = getRequiredSheet('style-regions');
        this.styleDefault = getRequiredElement('style-default-regions');

        this.setupDispatcher();
    }

    init() {
        this.applyDefaultColors();
    }

    setState() {
        this.refreshColors();
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.RESET, () => {
            this.init();
            this.refreshColors();
        });
        this.dispatcher.on(EVENTS.BUCKET, () => { this.clearFeatureColors(); });
        this.dispatcher.on(EVENTS.CMAP, () => { this.refreshColors(); });
        this.dispatcher.on(EVENTS.CMAP_RANGE, () => { this.refreshColors(); });
        this.dispatcher.on(EVENTS.LOG_SCALE, () => { this.refreshColors(); });
        this.dispatcher.on(EVENTS.FEATURE, (ev) => {
            if (!ev.isVolume) {
                this.refreshColors();
            }
        });
        this.dispatcher.on(EVENTS.REFRESH, () => { this.refreshColors(); });
        this.dispatcher.on(EVENTS.MAPPING, () => {
            this.applyDefaultColors();
            this.refreshColors();
        });
        this.dispatcher.on(EVENTS.STAT, () => { this.refreshColors(); });
    }

    applyDefaultColors() {
        this.styleDefault.href = getDefaultRegionColorsHref(this.state.mapping);
    }

    clearFeatureStyles() {
        clearStyle(this.style);
    }

    publishRegionColors(key, regionColors) {
        this.dispatcher.data(this, 'regionColors', key, regionColors);
    }

    clearFeatureColors() {
        this.clearFeatureStyles();
        this.applyDefaultColors();
        this.publishRegionColors('', {});
    }

    getRegionColors() {
        return this.model.getColors(this.state);
    }

    getColoringView() {
        const regionColors = this.getRegionColors();
        if (!regionColors) {
            return null;
        }
        return buildRegionColoringView(this.state.mapping, this.state.fname, regionColors);
    }

    renderColoringView(view) {
        this.clearFeatureStyles();
        this.applyDefaultColors();

        for (const rule of view.rules) {
            this.style.insertRule(rule);
        }
    }

    refreshColors() {
        if (!this.state.fname) {
            this.clearFeatureColors();
            this.dispatcher.spinning(this, false);
            return;
        }

        this.dispatcher.spinning(this, true);

        const view = this.getColoringView();
        if (!view) {
            this.clearFeatureColors();
            this.dispatcher.spinning(this, false);
            return;
        }

        this.renderColoringView(view);
        this.publishRegionColors(view.websocketKey, view.websocketData);
        this.dispatcher.spinning(this, false);
    }
};
