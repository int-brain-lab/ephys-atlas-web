export { Maximizer };



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/



/*************************************************************************************************/
/* Maximizer                                                                                     */
/*************************************************************************************************/

class Maximizer {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.dispatcher = dispatcher;

        this.maxCoronal = document.getElementById('maximizer-coronal');
        this.maxSagittal = document.getElementById('maximizer-sagittal');
        this.maxHorizontal = document.getElementById('maximizer-horizontal');
        this.maxSwanson = document.getElementById('maximizer-swanson');
        this.maxUnity = document.getElementById('maximizer-unity');
        this.maxTop = document.getElementById('maximizer-top');
        this.maxStat = document.getElementById('maximizer-stat');
        this.maximizers = [
            this.maxCoronal,
            this.maxSagittal,
            this.maxHorizontal,
            this.maxSwanson,
            this.maxUnity,
            this.maxTop,
        ]

        // Setup the maximizers.
        this.setupMaximizers();
    }

    setupMaximizers() {
        for (let maximizer of this.maximizers) {
            maximizer.addEventListener("click", (e) => {
                this.maximize(e.target.parentElement);
            });
        }

        this.maxStat.addEventListener("click", (e) => {
            this.dispatcher.toggleStatToolbox(this);
        });

        document.body.addEventListener('keydown', (e) => {
            if (e.key == "Escape") {
                this.clear();
            }
        });
    }

    maximize(item) {
        if (item)
            item.classList.toggle("maximized");
    }

    clear() {
        for (let maximizer of this.maximizers) {
            maximizer.parentElement.classList.remove("maximized");
        }
    }
};
