export { Feature };

import { DEFAULT_BUCKET } from "./state.js";
import { URLS } from "./model.js";
import { EVENTS } from "./core/events.js";
import { getRequiredElement } from "./core/dom.js";
import { FeatureDropdown } from "./feature-dropdown.js";
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
                this.selectFeature(state.fname, state.isVolume);
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
                await this.model.downloadFeatures(state.bucket, state.fname);
                this.selectFeature(state.fname, state.isVolume);
            }
        });
        this.dispatcher.on(EVENTS.REFRESH, () => { this.refreshBucket(); });
        this.dispatcher.on(EVENTS.BUCKET_REMOVE, () => {
            this.model.clearFeaturePrefetch();
            this.setBucket(DEFAULT_BUCKET);
        });
        this.dispatcher.on(EVENTS.FEATURE_REMOVE, (ev) => {
            this.selectFeature('');
            this.model.deleteLocalFeature(ev.fname);
            this.refreshBucket();
        });
    }

    setupFeature() {
        this.el.addEventListener('change', async () => {
            const fname = this.el.value;
            const state = this.state;

            if (!fname) {
                this.selectFeature('');
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
            await this.model.downloadFeatures(this.state.bucket, this.state.fname, { refresh: true });
            this.dropdown.select(this.state.fname);
            this.model.scheduleFeaturePrefetch(this.state.bucket, this.state.fname);
        }

        this.dispatcher.spinning(this, false);
    }

    selectFeature(fname, isVolume) {
        console.log(`select feature ${fname}, volume=${isVolume}`);
        this.state.setFeature(fname, isVolume);
        this.dropdown.select(fname);

        if (fname) {
            this.model.scheduleFeaturePrefetch(this.state.bucket, fname);
        }
        else {
            this.model.clearFeaturePrefetch();
        }

        this.dispatcher.feature(this, fname, isVolume);
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
