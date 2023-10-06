export { Share };



/*************************************************************************************************/
/* Share                                                                                         */
/*************************************************************************************************/

class Share {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.ishare = document.getElementById('share-button');

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
        ];
        for (let name of events) {
            this.dispatcher.on(name, (ev) => {
                this.state.updateURL();
            });
        }

        this.dispatcher.on('share', (ev) => {
            let url = this.state.updateURL();

            // Copy the URL to the clipboard.
            navigator.clipboard.writeText(url);

            // Feedback.
            this.ishare.innerHTML = "copied!";
            setTimeout(() => { this.ishare.innerHTML = "share"; }, 1500);
        });
    }
};
