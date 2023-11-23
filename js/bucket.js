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
        this.buttonUpload = document.getElementById('button-upload');

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
            // this.select(bucket);

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

            // Clear the selected feature when changing bucket.
            this.state.fname = '';

            // Download the bucket before dispatching the bucket selection event.
            // this.splash.setDescription(`Loading bucket ${bucket}...`);
            // this.splash.start();
            // this.splash.end();

            if (bucket) {
                await this.model.downloadBucket(bucket);
                // this.select(bucket);
            }
            // The features component with trigger a features download if state.fname is set.
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

            // NOTE: special handling of local bucket: removing means deleting the current
            // feature from the local cache.
            if (bucket == "local") {
                this.dispatcher.featureRemove(this, bucket, this.state.fname);
                return;
            }

            if (DEFAULT_BUCKETS.includes(bucket)) return;
            this.remove(bucket);
            this.dispatcher.bucketRemove(this, bucket);
        });

        // Upload feature.
        this.buttonUpload.addEventListener('click', (e) => {

            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';

            // Set up event listener for file selection
            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    const fileName = file.name;
                    const text = await file.text();
                    const cache = await caches.open('localCache');
                    await cache.put(fileName, new Response(text));
                    console.log('File uploaded and stored in cache.');
                    this.dispatcher.refresh(this, this.state.bucket);
                }
            });

            // Trigger the click event on the file input
            fileInput.click();

            fileInput.remove();
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
        console.log(`select bucket ${bucket}`);
        if (!bucket)
            return;

        this.el.value = bucket;

        this.state.bucket = bucket;
        // this.state.fname = '';
    }

};
