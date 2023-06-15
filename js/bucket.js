export { Bucket };

import { setOptions, addOption } from "./utils.js";
import { DEFAULT_BUCKETS } from "./state.js";



/*************************************************************************************************/
/* Bucket                                                                                        */
/*************************************************************************************************/

class Bucket {
    constructor(state) {
        // options have data-alias data-uuid
        this.el = document.getElementById('feature-set-dropdown');

        this.state = state;
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        setOptions(this.el, state.buckets, state.fset);
    }

    add(uuid_or_alias) {
        addOption(this.el, uuid_or_alias, false);
    }

    select(uuid_or_alias) {
        this.el.value = uuid_or_alias;
    }

};


