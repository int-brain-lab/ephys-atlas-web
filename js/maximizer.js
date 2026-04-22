export { Maximizer };

import { getRequiredElement } from "./core/dom.js";



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

        this.maxCoronal = getRequiredElement('maximizer-coronal');
        this.maxSagittal = getRequiredElement('maximizer-sagittal');
        this.maxHorizontal = getRequiredElement('maximizer-horizontal');
        this.maxSwanson = getRequiredElement('maximizer-swanson');
        this.maxUnity = getRequiredElement('maximizer-unity');
        this.maxTop = getRequiredElement('maximizer-top');
        this.maxStat = getRequiredElement('maximizer-stat');
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

        this.maxStat.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.dispatcher.toggleStatToolbox(this);
            }
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
