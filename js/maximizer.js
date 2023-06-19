export { Maximizer };



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/



/*************************************************************************************************/
/* Maximizer                                                                                     */
/*************************************************************************************************/

class Maximizer {
    constructor(state, db, dispatcher) {
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

        // Setup the maximizers.
        this.setupMaximizers();
    }

    setupMaximizers() {
        for (let maximizer of this.maximizers) {
            maximizer.addEventListener("click", (e) => {
                this.maximize(e.target.parentElement);
            });
        }

        let that = this;
        document.body.addEventListener('keydown', function (e) {
            if (e.key == "Escape") {
                that.clear();
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
