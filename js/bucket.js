export { Bucket };

import { setOptions, addOption } from "./utils.js";
import { DEFAULT_BUCKETS } from "./state.js";



/*************************************************************************************************/
/* Bucket                                                                                        */
/*************************************************************************************************/

class Bucket {
    constructor(state, db, dispatcher) {
        this.state = state;
        this.db = db;
        this.dispatcher = dispatcher;

        this.el = document.getElementById('feature-set-dropdown');

        this.setupBucket();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        setOptions(this.el, state.buckets, state.fset);
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupBucket() {
        this.el.addEventListener('change', (e) => {
            let fset = e.target.value;
            this.select(fset);
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
        this.state.fset = uuid_or_alias;
        this.dispatcher.bucket(this, uuid_or_alias);
    }

};

