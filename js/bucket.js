export { Bucket };

import { setOptions, addOption, removeOption, removeFromArray } from "./utils.js";



/*************************************************************************************************/
/* Bucket                                                                                        */
/*************************************************************************************************/

class Bucket {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.el = document.getElementById('bucket-dropdown');
        this.button = document.getElementById('button-new-bucket');

        this.setupBucket();
        this.setupDispatcher();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        setOptions(this.el, state.buckets, state.bucket);
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('clear', (ev) => { this.init(); });
        this.dispatcher.on('bucket', (ev) => { this.select(ev.uuid_or_alias); });
        this.dispatcher.on('bucketRemove', (ev) => { this.remove(ev.uuid_or_alias); });
    }

    setupBucket() {
        this.el.addEventListener('change', (e) => {
            let bucket = e.target.value;
            this.select(bucket);
            this.dispatcher.bucket(this, bucket);
        });

        this.button.addEventListener('click', (e) => {
            let bucket = window.prompt("write a new bucket UUID or alias", "");
            if (bucket) {
                this.add(bucket, true);
                this.select(bucket);
                this.dispatcher.bucket(this, bucket);
            }
        });
    }

    /* Bucket functions                                                                          */
    /*********************************************************************************************/

    add(bucket, selected) {
        if (!this.state.buckets.includes(bucket))
            this.state.buckets.push(bucket);
        addOption(this.el, bucket, bucket, selected);
    }

    remove(bucket) {
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
