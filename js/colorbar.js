export { Colorbar };

import { clamp } from "./utils.js";



/*************************************************************************************************/
/* Colorbar                                                                                      */
/*************************************************************************************************/

class Colorbar {
    constructor(state, db, dispatcher) {
        this.state = state;
        this.db = db;
        this.dispatcher = dispatcher;

        this.cbar = document.querySelector('#bar-scale .colorbar');
        this.featureMin = document.querySelector('#bar-scale .min');
        this.featureMax = document.querySelector('#bar-scale .max');

        this.setupDispatcher();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        this.setColorbar();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('feature', (e) => { this.setColorbar(); });
        this.dispatcher.on('cmap', (e) => { this.setColorbar(); });
        this.dispatcher.on('cmapRange', (e) => { this.setColorbar(); });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    clear() {
        this.cbar.innerHTML = '';
    }

    setColorbar() {
        if (!this.state.fname) {
            this.clear();
            return;
        }

        let colors = this.db.getColormap(this.state.cmap);
        let cmin = this.state.cmapmin;
        let cmax = this.state.cmapmax;

        let nTotal = colors.length;
        let n = 50; // number of colobar items
        let child = null;

        if (this.cbar.children.length == 0) {
            for (let i = 0; i < n; i++) {
                child = document.createElement('div');
                child.classList.add(`bar-${i}`);
                this.cbar.appendChild(child);
            }
        }
        let children = this.cbar.children;
        let x = 0;
        for (let i = 0; i < n; i++) {
            child = children[i];
            x = i * 100.0 / n;
            x = (x - cmin) / (cmax - cmin);
            x = clamp(x, 0, .9999);
            child.style.backgroundColor = colors[Math.floor(x * nTotal)];
        }
    }
};


