export { Feature };

import { DEFAULT_BUCKET } from "./state.js";
import { URLS } from "./model.js";
import { EVENTS } from "./core/events.js";
import { getRequiredElement } from "./core/dom.js";
import { FeatureDropdown } from "./feature-dropdown.js";
import { applyFeatureSelection, loadAndSelectFeature } from "./feature-selection-service.js";
import { downloadBinaryFile, removeFromArray } from "./utils.js";

class Feature {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.el = getRequiredElement('feature-dropdown');
        this.dropdown = new FeatureDropdown(this.el);

        this.setupDispatcher();
        this.setupFeature();
    }

    init() {
        // this.setState(this.state);
    }

    async setState(state) {
        if (state.fname && !state.isVolume) {
            this.model.downloadFeatures(state.bucket, state.fname).then(() => {
                applyFeatureSelection({
                    state: this.state,
                    model: this.model,
                    dispatcher: this.dispatcher,
                    source: this,
                    dropdown: this.dropdown,
                    fname: state.fname,
                    isVolume: state.isVolume,
                });
            });
        }
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.RESET, () => { this.init(); this.selectFeature(); });
        this.dispatcher.on(EVENTS.BUCKET, async (ev) => {
            this.model.clearFeaturePrefetch();
            this.setBucket(ev.uuid_or_alias);

            if (this.state.fname) {
                const state = this.state;
                await loadAndSelectFeature({
                    state: this.state,
                    model: this.model,
                    dispatcher: this.dispatcher,
                    source: this,
                    dropdown: this.dropdown,
                    fname: state.fname,
                    isVolume: state.isVolume,
                });
            }
        });
        this.dispatcher.on(EVENTS.REFRESH, () => { this.refreshBucket(); });
        this.dispatcher.on(EVENTS.BUCKET_REMOVE, () => {
            this.model.clearFeaturePrefetch();
            this.setBucket(DEFAULT_BUCKET);
        });
        this.dispatcher.on(EVENTS.FEATURE_REMOVE, (ev) => {
            applyFeatureSelection({
                state: this.state,
                model: this.model,
                dispatcher: this.dispatcher,
                source: this,
                dropdown: this.dropdown,
                fname: '',
                isVolume: undefined,
            });
            this.model.deleteLocalFeature(ev.fname);
            this.refreshBucket();
        });
    }

    setupFeature() {
        this.el.addEventListener('change', async () => {
            const fname = this.el.value;
            const state = this.state;

            if (!fname) {
                applyFeatureSelection({
                state: this.state,
                model: this.model,
                dispatcher: this.dispatcher,
                source: this,
                dropdown: this.dropdown,
                fname: '',
                isVolume: undefined,
            });
                return;
            }

            await this.model.downloadFeatures(state.bucket, fname);

            const vol = this.model.getVolumeData(state.bucket, fname, this.state.mapping);
            const isVol = vol != undefined;

            this.selectFeature(fname, isVol);
        });
    }

    setBucket(uuid_or_alias) {
        const bucket = this.model.getBucket(uuid_or_alias);
        if (!bucket) return;

        console.log('set bucket', uuid_or_alias);
        console.assert(bucket);

        if (!bucket.metadata) {
            this.state.setBucket(DEFAULT_BUCKET);
            this.state.setBuckets(removeFromArray(this.state.buckets, uuid_or_alias));
            this.state.clearFeature();

            if (uuid_or_alias != DEFAULT_BUCKET) {
                this.dispatcher.bucketRemove(this, uuid_or_alias);
                this.dispatcher.bucket(this, this.state.bucket);
            }

            const msg = `error retrieving bucket ${uuid_or_alias}`;
            console.error(msg);
            window.alert(msg);
        }
        else {
            this.dropdown.setFeatures(bucket.features, bucket.metadata.tree, bucket.metadata.volumes);
        }
    }

    async refreshBucket() {
        this.dispatcher.spinning(this, true);
        console.debug(`refreshing bucket ${this.state.bucket}`);

        await this.model.downloadBucket(this.state.bucket, { refresh: true });
        const bucket = this.model.getBucket(this.state.bucket);
        console.assert(bucket);
        this.dropdown.setFeatures(bucket.features, bucket.metadata.tree, bucket.metadata.volumes);

        this.model.clearFeaturePrefetch();

        if (this.state.fname) {
            await loadAndSelectFeature({
                state: this.state,
                model: this.model,
                dispatcher: this.dispatcher,
                source: this,
                dropdown: this.dropdown,
                fname: this.state.fname,
                isVolume: this.state.isVolume,
                options: { refresh: true },
            });
        }

        this.dispatcher.spinning(this, false);
    }

    selectFeature(fname, isVolume) {
        applyFeatureSelection({
            state: this.state,
            model: this.model,
            dispatcher: this.dispatcher,
            source: this,
            dropdown: this.dropdown,
            fname,
            isVolume,
        });
    }

    async download() {
        if (!this.state.bucket || !this.state.fname) {
            return;
        }
        const url = URLS.features(this.state.bucket, this.state.fname) + '?download=1';
        const filename = `${this.state.fname}.json`;
        downloadBinaryFile(url, filename);
    }
};
