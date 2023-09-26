export { Share };



/*************************************************************************************************/
/* Share                                                                                         */
/*************************************************************************************************/

class Share {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.setupDispatcher();
    }

    setupDispatcher() {
        let events = [
            'bucket',
            'bucketRemove',
            'clear',
            'cmap',
            'cmapRange',
            'feature',
            'logScale',
            'mapping',
            'search',
            'slice',
            'stat',
            'toggle',
            'volume',
        ];
        for (let name of events) {
            this.dispatcher.on(name, (ev) => {
                this.state.updateURL();
            });
        }
    }
};
