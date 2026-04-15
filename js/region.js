export { Region };

import { getRequiredElement } from "./core/dom.js";
import { buildVisibleRegions, getRegionTitle } from "./core/region-helpers.js";
import { EVENTS } from "./core/events.js";
import { RegionListView } from "./region-view.js";
import { resolveCompatibleMappingForFeature } from "./region-policy.js";

class Region {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.el = getRequiredElement('bar-plot-list');
        this.sortButton = getRequiredElement('bar-plot-sort');
        this.regionTitle = getRequiredElement('bar-plot-title');

        this.regionList = new RegionListView(this.state, this.dispatcher, {
            list: this.el,
            sortButton: this.sortButton,
            title: this.regionTitle,
        });

        this.setupDispatcher();
    }

    async init() {
        await this.setState();
    }

    async setState() {
        await this.setRegions();
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.RESET, () => { this.init(); });

        this.dispatcher.on(EVENTS.FEATURE, (ev) => {
            const mappings = this.model.getFeatureMappings(this.state.bucket, ev.fname);
            const mapping = resolveCompatibleMappingForFeature({
                isVolume: this.state.isVolume,
                currentMapping: this.state.mapping,
                mappings,
            });
            if (mapping) {
                console.warn(`automatically switching to mapping ${mapping} as the selected features do not contain any data with the current mapping`);
                this.state.setMapping(mapping);
                this.dispatcher.mapping(this, mapping);
                return;
            }
            this.setRegions();
        });
        this.dispatcher.on(EVENTS.MAPPING, () => { this.setRegions(); });
        this.dispatcher.on(EVENTS.STAT, () => { this.setRegions(); });
        this.dispatcher.on(EVENTS.SEARCH, () => { this.setRegions(); });
        this.dispatcher.on(EVENTS.BUCKET, () => { this.setRegions(); });
    }

    async setRegions() {
        console.assert(this.state.mapping);
        const regions = this.model.getRegions(this.state.mapping);
        const features = this.state.isVolume ? null : this.model.getFeatures(
            this.state.bucket,
            this.state.fname,
            this.state.mapping,
        );
        const keptRegions = buildVisibleRegions(regions, features, this.state.stat, this.state.search);

        this.dispatcher.data(this, 'regionValues', this.state.fname, keptRegions);
        this.regionList.setRegions(this.state.mapping, keptRegions);
        this.regionList.setTitle(getRegionTitle(this.state.fname, this.state.stat));
        this.regionList.resetSort();
    }
};
