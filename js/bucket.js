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

        this.el = document.getElementById('feature-set-dropdown');

        this.setupBucket();
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
    }

    /* Bucket functions                                                                          */
    /*********************************************************************************************/

    add(uuid_or_alias) {
        addOption(this.el, uuid_or_alias, false);
    }

    select(uuid_or_alias) {
        console.log(`select ${uuid_or_alias}`);
        this.el.value = uuid_or_alias;
        this.state.bucket = uuid_or_alias;
        this.state.fname = '';
        this.dispatcher.bucket(this, uuid_or_alias);
    }

};


