export { Feature };

import { DEFAULT_BUCKET } from "./state.js";
import { URLS } from "./model.js";
import { downloadBinaryFile, removeFromArray, removeClassChildren } from "./utils.js";



/*************************************************************************************************/
/* Feature tree                                                                                  */
/*************************************************************************************************/

class FeatureTree {
    constructor(el) {
        this.el = el;
    }

    setFeatures(features, tree, volumes) {
        if (!tree || tree.length == 0) {
            // Convert a flat array into a flat tree.
            tree = Object.keys(features).reduce((obj, key) => { obj[key] = key; return obj; }, {});
        }
        console.assert(tree);
        volumes = volumes || [];
        const generateTree = (obj) => {
            let html = '';
            for (const key in obj) {
                let fname = obj[key];
                let displayName = key;
                let desc = features[fname] ? features[fname]['short_desc'] : '';
                let isVol = volumes.includes(fname);

                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    html += `<details><summary>${key}</summary><ul>`;
                    html += generateTree(obj[key]);
                    html += `</ul></details>`;
                } else {
                    html += `<li data-fname="${fname}" data-desc="${desc}" data-volume="${isVol}">${displayName}</li>`;
                }
            }
            return html;
        };
        this.el.innerHTML = `<ul>${generateTree(tree)}</ul>`;
    }

    clear() {
        removeClassChildren(this.el, 'LI', 'selected');
    }

    get(fname) {
        return this.el.querySelector(`[data-fname=${fname}]`);
    }

    select(fname) {
        this.clear();
        if (fname) {
            let el = this.get(fname);
            if (el)
                el.classList.add('selected');
        }

    }

    selected(fname) {
        return this.get(fname).classList.contains('selected');
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

        this.el = document.getElementById('feature-tree');

        this.tree = new FeatureTree(this.el);

        this.setupDispatcher();
        this.setupFeature();
    }

    init() {
        this.setState(this.state);
    }

    async setState(state) {
        await this.setBucket(state.bucket);
        if (state.fname)
            this.selectFeature(state.fname)
        else if (state.volume)
            this.selectVolume(state.volume)
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.init(); });
        this.dispatcher.on('bucket', (ev) => { this.setBucket(ev.uuid_or_alias); });
        this.dispatcher.on('refresh', (ev) => { this.refreshBucket(); });
        this.dispatcher.on('bucketRemove', (ev) => { this.setBucket(DEFAULT_BUCKET); });
    }

    setupFeature() {
        this.el.addEventListener('click', (e) => {
            if (e.target.tagName == 'LI') {
                let fname = e.target.dataset.fname;
                let isVol = e.target.dataset.volume == "true";
                if (this.tree.selected(fname))
                    this.selectFeature('');
                else if (!isVol)
                    this.selectFeature(fname);
                else if (isVol)
                    this.selectVolume(fname);
            }
        });

        this.el.addEventListener('mouseover', (e) => {
            if (e.target.tagName == 'LI') {
                let fname = e.target.dataset.fname;
                let desc = e.target.dataset.desc;
                this.dispatcher.featureHover(this, fname, desc, e);
            }
        });

        this.el.addEventListener('mouseout', (e) => {
            if (e.target.tagName == 'LI') {
                this.dispatcher.featureHover(this, null, null, null);
            }
        });
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    async setBucket(uuid_or_alias) {
        let bucket = await this.model.getBucket(uuid_or_alias);
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
            this.tree.setFeatures(bucket.features, bucket.metadata.tree, bucket.metadata.volumes);
        }
    }

    async refreshBucket() {
        this.dispatcher.spinning(this, true);

        console.debug(`refreshing bucket ${this.state.bucket}`)
        let bucket = await this.model.getBucket(this.state.bucket, { cache: "reload" });
        console.assert(bucket);
        this.tree.setFeatures(bucket.features, bucket.metadata.tree);
        this.tree.select(this.state.fname);

        this.dispatcher.spinning(this, false);
    }

    selectFeature(fname) {
        console.log(`select feature ${fname}`);
        this.state.fname = fname;
        this.state.volume = null;
        this.tree.select(fname);
        this.dispatcher.feature(this, fname);
        this.dispatcher.volume(this, "");
    }

    selectVolume(fname) {
        console.log(`select volume ${fname}`);
        this.state.fname = null;
        this.state.volume = fname;
        this.tree.select(fname);
        this.dispatcher.feature(this, "");
        this.dispatcher.volume(this, fname);
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
