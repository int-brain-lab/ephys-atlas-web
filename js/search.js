export { Search };

// import { downloadJSON } from "./utils.js";



/*************************************************************************************************/
/* Search                                                                                        */
/*************************************************************************************************/

class Search {
    constructor(state, db, dispatcher) {
        this.state = state;
        this.dispatcher = dispatcher;

        this.el = document.getElementById("search-input");

        this.setupDispatcher();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        this.searchInput.value = state.search;
        this.setText(state.search);
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.el.addEventListener("input", (e) => {
            this.state.search = e.target.value;
            this.dispatcher.search(e.target.value);
        });
    }

    /* Public functions                                                                          */
    /*********************************************************************************************/

    setText(text) {
        this.el.value = text;
    }
};


