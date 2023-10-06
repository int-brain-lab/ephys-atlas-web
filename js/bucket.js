export { Bucket };

import { setOptions, addOption, removeOption, removeFromArray } from "./utils.js";
import { DEFAULT_BUCKET, DEFAULT_BUCKETS } from "./state.js";


/*************************************************************************************************/
/* Bucket                                                                                        */
/*************************************************************************************************/

class Bucket {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.splash = model.splash;
        this.dispatcher = dispatcher;

        this.el = document.getElementById('bucket-dropdown');
        this.buttonAdd = document.getElementById('button-new-bucket');
        this.buttonRefresh = document.getElementById('button-refresh-bucket');
        this.buttonRemove = document.getElementById('button-remove-bucket');

        this.setupBucket();
        this.setupDispatcher();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        const bucket = state.bucket;
        setOptions(this.el, state.buckets, bucket);

        // Initially, download the bucket, and raise the bucket selection event afterwards.
        this.model.downloadBucket(bucket).then(() => {
            this.select(bucket);

            this.dispatcher.bucket(this, bucket);
        });
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('clear', (ev) => { this.init(); });
        this.dispatcher.on('bucket', (ev) => { this.select(ev.uuid_or_alias); });
        this.dispatcher.on('bucketRemove', (ev) => { this.remove(ev.uuid_or_alias); });
    }

    setupBucket() {
        this.el.addEventListener('change', async (e) => {
            let bucket = e.target.value;

            // Download the bucket before dispatching the bucket selection event.
            // this.splash.setDescription(`Loading bucket ${bucket}...`);
            // this.splash.start();
            // this.splash.end();

            if (bucket) {
                await this.model.downloadBucket(bucket);
                this.select(bucket);
            }
            this.dispatcher.bucket(this, bucket);
        });

        // Add bucket.
        this.buttonAdd.addEventListener('click', async (e) => {
            let bucket = window.prompt("write a new bucket UUID or alias", "");
            if (bucket) {
                this.add(bucket, true);
                this.select(bucket);

                await this.model.downloadBucket(bucket);

                this.dispatcher.bucket(this, bucket);
            }
        });

        // Refresh bucket.
        this.buttonRefresh.addEventListener('click', (e) => {
            let bucket = this.state.bucket;
            this.dispatcher.refresh(this, bucket);
        });

        // Remove bucket.
        this.buttonRemove.addEventListener('click', (e) => {
            let bucket = this.state.bucket;
            if (DEFAULT_BUCKETS.includes(bucket)) return;
            this.remove(bucket);
            this.dispatcher.bucketRemove(bucket);
        });
    }

    /* Bucket functions                                                                          */
    /*********************************************************************************************/

    add(bucket, selected) {
        if (DEFAULT_BUCKETS.includes(bucket)) return;
        if (!this.state.buckets.includes(bucket))
            this.state.buckets.push(bucket);
        addOption(this.el, bucket, bucket, selected);
    }

    remove(bucket) {
        this.state.bucket = DEFAULT_BUCKET;
        if (this.state.buckets.includes(bucket))
            this.state.buckets = removeFromArray(this.state.buckets, bucket);
        removeOption(this.el, bucket);
    }

    select(bucket) {
        console.log(`select ${bucket}`);
        if (!bucket)
            return;

        this.el.value = bucket;

        this.state.bucket = bucket;
        this.state.fname = '';
    }

};
