export { Feature };

import { DEFAULT_BUCKET } from "./state.js";
import { URLS } from "./model.js";
import { EVENTS } from "./core/events.js";
import { getRequiredElement } from "./core/dom.js";
import { buildFeatureDropdownEntries } from "./core/feature-tree.js";
import { downloadBinaryFile, removeFromArray } from "./utils.js";


/*************************************************************************************************/
/* Feature dropdown                                                                             */
/*************************************************************************************************/

class FeatureDropdown {
    constructor(el) {
        this.el = el;
    }

    setFeatures(features, tree, volumes) {
        features = features || {};
        volumes = volumes || [];

        const entries = buildFeatureDropdownEntries(tree, features);
        this.el.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a feature';
        this.el.appendChild(placeholder);

        for (const { fname, label } of entries) {
            const option = document.createElement('option');
            option.value = fname;
            option.textContent = label;
            const desc = features[fname] ? features[fname]['short_desc'] : '';
            const unit = features[fname] ? features[fname]['unit'] : '';
            const titleParts = [];
            if (desc) titleParts.push(desc);
            if (unit) titleParts.push(`Unit: ${unit}`);
            if (titleParts.length) {
                option.title = titleParts.join('\n');
            }
            this.el.appendChild(option);
        }

        this.el.disabled = entries.length === 0;
    }

    select(fname) {
        if (!fname || !this._hasOption(fname)) {
            this.el.value = '';
        } else {
            this.el.value = fname;
        }
    }

    clear() {
        this.el.value = '';
    }

    selected(fname) {
        return this.el.value === fname;
    }

    _hasOption(fname) {
        return Array.from(this.el.options).some((option) => option.value === fname);
    }
}



/*************************************************************************************************/
/* Feature                                                                                       */
/*************************************************************************************************/

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
                // Dispatch the feature selected event.
                this.selectFeature(state.fname, state.isVolume);
            });
        }
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on(EVENTS.RESET, (ev) => { this.init(); this.selectFeature(); });
        this.dispatcher.on(EVENTS.BUCKET, async (ev) => {
            this.model.clearFeaturePrefetch();
            this.setBucket(ev.uuid_or_alias);

            if (this.state.fname) {
                const state = this.state;

                // Download the features, including the case where a prefetch is already in flight.
                await this.model.downloadFeatures(state.bucket, state.fname);

                // Select the features.
                this.selectFeature(state.fname, state.isVolume);
            }
        });
        this.dispatcher.on(EVENTS.REFRESH, (ev) => { this.refreshBucket(); });
        this.dispatcher.on(EVENTS.BUCKET_REMOVE, (ev) => {
            this.model.clearFeaturePrefetch();
            this.setBucket(DEFAULT_BUCKET);
        });
        this.dispatcher.on(EVENTS.FEATURE_REMOVE, (ev) => {
            this.selectFeature(''); // deselect
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

            const fet = this.model.getFeatures(state.bucket, fname, this.state.mapping);
            const vol = this.model.getVolumeData(state.bucket, fname, this.state.mapping);
            const isVol = vol != undefined;

            this.selectFeature(fname, isVol);
        });
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    setBucket(uuid_or_alias) {
        let bucket = this.model.getBucket(uuid_or_alias);
        if (!bucket) return;

        console.log("set bucket", uuid_or_alias);
        console.assert(bucket);

        if (!bucket.metadata) {
            // Error message if the bucket does not exist.

            this.state.setBucket(DEFAULT_BUCKET);
            this.state.setBuckets(removeFromArray(this.state.buckets, uuid_or_alias));
            this.state.clearFeature();

            if (uuid_or_alias != DEFAULT_BUCKET) {
                this.dispatcher.bucketRemove(this, uuid_or_alias);
                this.dispatcher.bucket(this, this.state.bucket);
            }

            // Finally display an error message.
            let msg = `error retrieving bucket ${uuid_or_alias}`;
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
        let bucket = this.model.getBucket(this.state.bucket);
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
            // TODO: what should the DOWNLOAD button do when no feature is selected?
            return;
        }
        let url = URLS['features'](this.state.bucket, this.state.fname) + "?download=1";
        let filename = `${this.state.fname}.json`;
        downloadBinaryFile(url, filename);
    }
};
