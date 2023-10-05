export { Colorbar };

import { clamp, displayNumber } from "./utils.js";



/*************************************************************************************************/
/* Colorbar                                                                                      */
/*************************************************************************************************/

class Colorbar {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
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
        this.dispatcher.on('reset', (ev) => { this.init(); });
        this.dispatcher.on('feature', (e) => { this.setColorbar(); this.setFeatureRange(); });
        this.dispatcher.on('cmap', (e) => { this.setColorbar(); });
        this.dispatcher.on('cmapRange', (e) => { this.setColorbar(); });
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    clear() {
        this.cbar.innerHTML = '';
        this.featureMin.innerHTML = '';
        this.featureMax.innerHTML = '';
    }

    async setFeatureRange() {
        // Display vmin and vmax.
        if (!this.state.isVolume) {
            let features = await this.model.getFeatures(this.state.bucket, this.state.mapping, this.state.fname);
            if (features) {
                let stats = features['statistics'][this.state.stat];
                let vmin = stats['min'];
                let vmax = stats['max'];
                this.featureMin.innerHTML = displayNumber(vmin);
                this.featureMax.innerHTML = displayNumber(vmax);
            }
        } else {
            // TODO
            this.featureMin.innerHTML = "0";
            this.featureMax.innerHTML = "1";
        }
    }

    setColorbar() {
        if (!this.state.fname) {
            this.clear();
            return;
        }

        let colors = this.model.getColormap(this.state.cmap);
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


