export { Feature };

import { DEFAULT_BUCKET } from "./state.js";
import { URLS } from "./model.js";
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
        if (!tree || tree.length == 0) {
            tree = Object.keys(features).reduce((obj, key) => { obj[key] = key; return obj; }, {});
        }

        const entries = this._flattenTree(tree);
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
            if (desc) {
                option.title = desc;
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

    _flattenTree(node, prefix = []) {
        if (!node) return [];

        const entries = [];
        for (const key in node) {
            if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
            const value = node[key];
            if (value && typeof value === 'object') {
                entries.push(...this._flattenTree(value, prefix.concat(key)));
            } else {
                const labelParts = prefix.concat(key);
                const label = labelParts.filter(Boolean).join(' / ');
                entries.push({ fname: value, label });
            }
        }
        return entries;
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

        this.el = document.getElementById('feature-dropdown');

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
        this.dispatcher.on('reset', (ev) => { this.init(); this.selectFeature(); });
        this.dispatcher.on('bucket', async (ev) => {
            this.setBucket(ev.uuid_or_alias);

            if (this.state.fname) {
                const state = this.state;

                // Download the features.
                if (!this.model.hasFeatures(state.bucket, state.fname)) {
                    await this.model.downloadFeatures(state.bucket, state.fname);
                }

                // Select the features.
                this.selectFeature(state.fname, state.isVolume);
            }
        });
        this.dispatcher.on('refresh', (ev) => { this.refreshBucket(); });
        this.dispatcher.on('bucketRemove', (ev) => { this.setBucket(DEFAULT_BUCKET); });
        this.dispatcher.on('featureRemove', (ev) => {
            this.selectFeature(''); // deselect
            this.model.localCache.delete(`${ev.fname}.json`);
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

            if (!this.model.hasFeatures(state.bucket, fname)) {
                await this.model.downloadFeatures(state.bucket, fname);
            }

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

            this.state.bucket = DEFAULT_BUCKET;
            this.state.buckets = removeFromArray(this.state.buckets, uuid_or_alias);
            this.state.fname = '';

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

        if (this.state.fname) {
            await this.model.downloadFeatures(this.state.bucket, this.state.fname, { refresh: true });
            this.dropdown.select(this.state.fname);
        }

        this.dispatcher.spinning(this, false);
    }

    selectFeature(fname, isVolume) {
        console.log(`select feature ${fname}, volume=${isVolume}`);
        this.state.fname = fname;
        this.state.isVolume = isVolume;
        this.dropdown.select(fname);
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
