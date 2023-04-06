export { Maximizer };



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/



/*************************************************************************************************/
/* Maximizer                                                                                     */
/*************************************************************************************************/

class Maximizer {
    constructor(state) {
        this.state = state;

        this.maxCoronal = document.getElementById('maximizer-coronal');
        this.maxSagittal = document.getElementById('maximizer-sagittal');
        this.maxHorizontal = document.getElementById('maximizer-horizontal');
        this.maxSwanson = document.getElementById('maximizer-swanson');
        this.maxUnity = document.getElementById('maximizer-unity');
        this.maxTop = document.getElementById('maximizer-top');
        this.maximizers = [
            this.maxCoronal,
            this.maxSagittal,
            this.maxHorizontal,
            this.maxSwanson,
            this.maxUnity,
            this.maxTop,
        ]

        // Use the state to select the initial values of the DOM elements.
        this.setState(this.state);

        // Setup the maximizers.
        this.setupMaximizers();
    }

    setState(state) {
    }

    setupMaximizers() {
        for (let maximizer of this.maximizers) {
            maximizer.addEventListener("click", (e) => {
                this.maximize(e.target.parentElement);
            });
        }
    }

    maximize(item) {
        if (item)
            item.classList.toggle("maximized");
    }
};
