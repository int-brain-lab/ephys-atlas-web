export { Panel };

import { getRequiredElement, getRequiredSelector } from './core/dom.js';
import { PanelActions } from './panel-actions.js';
import { PanelControls } from './panel-controls.js';

class Panel {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.elements = {
            el: getRequiredSelector('#control-panel details'),
            imapping: getRequiredElement('mapping-dropdown'),
            icmap: getRequiredElement('colormap-dropdown'),
            istat: getRequiredElement('stat-dropdown'),
            icmapmin: getRequiredElement('colormap-min'),
            icmapmax: getRequiredElement('colormap-max'),
            icmapminInput: getRequiredElement('colormap-min-input'),
            icmapmaxInput: getRequiredElement('colormap-max-input'),
            iclog: getRequiredElement('log-scale'),
            ibreset: getRequiredElement('reset-view-button'),
            ibclear: getRequiredElement('clear-cache-button'),
            ibconnect: getRequiredElement('connect-button'),
            ibexport: getRequiredElement('export-button'),
            ishare: getRequiredElement('share-button'),
        };

        this.controls = new PanelControls({
            state,
            model,
            dispatcher,
            elements: this.elements,
            source: this,
        });
        this.actions = new PanelActions({
            state,
            model,
            dispatcher,
            elements: this.elements,
            source: this,
            initPanelState: () => this.init(),
        });

        this.controls.init();
        this.actions.init();
    }

    init() {
        this.controls.setState(this.state);
    }
}
