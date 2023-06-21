export { Bucket };

import { setOptions, addOption } from "./utils.js";
import { DEFAULT_BUCKETS } from "./state.js";



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

    setupBucket() {
        this.el.addEventListener('change', (e) => {
            let bucket = e.target.value;
            this.select(bucket);
        });

        this.button.addEventListener('click', (e) => {
            let bucket = window.prompt("write a new bucket UUID or alias", "");
            if (bucket) {
                if (!this.state.buckets.includes(bucket))
                    this.state.buckets.push(bucket);
                this.add(bucket, true);
                this.select(bucket);
            }
        });
    }

    setupDispatcher() {
        this.dispatcher.on('clear', (ev) => { this.init(); });
    }

    /* Bucket functions                                                                          */
    /*********************************************************************************************/

    add(uuid_or_alias, selected) {
        addOption(this.el, uuid_or_alias, uuid_or_alias, selected);
    }

    select(uuid_or_alias) {
        console.log(`select ${uuid_or_alias}`);
        if (!uuid_or_alias)
            return;

        this.el.value = uuid_or_alias;

        this.state.bucket = uuid_or_alias;
        this.state.fname = '';
        this.dispatcher.bucket(this, uuid_or_alias);
    }

};
