export { Search };



/*************************************************************************************************/
/* Search                                                                                        */
/*************************************************************************************************/

class Search {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.dispatcher = dispatcher;

        this.el = document.getElementById("search-input");

        this.setupDispatcher();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        if (state.search) {
            this.el.value = state.search;
            this.setText(state.search)
        };
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.clear(); });

        this.el.addEventListener("input", (e) => {
            this.state.search = e.target.value;
            this.dispatcher.search(this, e.target.value);
        });

        // NOTE: clear the selection when the mapping changes.
        this.dispatcher.on('mapping', (e) => { this.clear(); });
    }

    /* Public functions                                                                          */
    /*********************************************************************************************/

    clear() {
        this.setText('');
    }

    setText(text) {
        this.state.search = text;
        this.el.value = text;
    }
};


