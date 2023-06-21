export { Selection };

import { e2idx } from "./utils.js";



/*************************************************************************************************/
/* Selection                                                                                     */
/*************************************************************************************************/

class Selection {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.el = document.getElementById('bar-selected-list');
        this.barPlot = document.getElementById('bar-plot-list');

        this.setupDispatcher();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        for (let idx of state.selected) {
            this.add(this.getFromIdx(idx));
        }
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    getFromIdx(idx) {
        return this.barPlot.querySelector(`[data-idx="${idx}"]`);
    }

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.init(); });

        this.el.addEventListener('click', (e) => {
            if (e.target.tagName == 'LI') {
                this.dispatcher.toggle(this, e2idx(this.state.mapping, e));
            }
        });

        this.dispatcher.on('toggle', (e) => {
            let idx = e.idx;
            let item = this.getFromIdx(idx);
            if (!item) return;

            this.toggle(item);
        });

        this.dispatcher.on('clear', (e) => { this.clear(); });

        // NOTE: clear the selection when the mapping changes.
        this.dispatcher.on('mapping', (e) => { this.clear(); });
    }

    /* Public functions                                                                          */
    /*********************************************************************************************/

    clear() {
        this.el.innerHTML = '';
    }

    add(item) {
        if (!item) return;
        this.el.appendChild(item.cloneNode(true));
        this.sort();
    }

    get(item) {
        console.assert(item);
        let idx = item.dataset.idx;
        return this.el.querySelector(`[data-idx="${idx}"]`);
    }

    remove(item) {
        console.assert(item);
        let child = this.get(item);
        if (child)
            this.el.removeChild(child);
    }

    toggle(item) {
        console.assert(item);
        let child = this.get(item);
        if (child) this.remove(child);
        else this.add(item);
    }

    sort() {
        // Get all the children matching the selector
        const children = Array.from(this.el.querySelectorAll('[data-idx]'));

        // Sort the children array based on the value of the data-idx attribute
        children.sort((a, b) => {
            const idxA = parseInt(a.getAttribute('data-idx'));
            const idxB = parseInt(b.getAttribute('data-idx'));
            return idxA - idxB;
        });

        // Append the sorted children back to the parent element
        children.forEach((child) => {
            this.el.appendChild(child);
        });
    }
};
