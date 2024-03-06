export { Unity };



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const UNITY_SPLASH_TOTAL = 50;



/*************************************************************************************************/
/* Unity                                                                                         */
/*************************************************************************************************/

class Unity {
    constructor(state, model, dispatcher) {
        console.log("setting up Unity");

        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;
        this.instance = null;
        this.loaded = false;

        // Declare the total splash progress for this component.
        // this.splash.addTotal(UNITY_SPLASH_TOTAL);

        this.setupSlider();
        this.setupDispatcher();
    }

    init() {
        let that = this;
        createUnityInstance(document.getElementById("unity-canvas"), {
            dataUrl: "Build/webgl.data",
            frameworkUrl: "Build/webgl.framework.js",
            codeUrl: "Build/webgl.wasm",
            companyName: "Daniel Birman @ UW",
            productName: "ephys_atlas",
            productVersion: "0.1.0",
        }).then((unityInstance) => {
            that.instance = unityInstance;
        });
    }

    setState(state) {
        this.update();
    }

    update() {
        this.setRegions();
        this.setExploded();
        this.setVisibility();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('mapping', (e) => { this.setRegions(); });
        this.dispatcher.on('feature', (e) => { this.setRegions(false); });
        this.dispatcher.on('cmap', (e) => { this.setRegions(false); });
        this.dispatcher.on('cmapRange', (e) => { this.setRegions(false); });
        this.dispatcher.on('logScale', (e) => { this.setRegions(false); });
        this.dispatcher.on('clear', (e) => { this.setVisibility(); });
    }

    setupSlider() {
        this.slider = document.getElementById('slider-unity');
        this.slider.value = this.state.exploded;

        this.slider.oninput = (e) => {
            this.setExploded(e.target.value);
        };
    }

    /* Internal functions                                                                        */
    /*********************************************************************************************/

    loadedCallback() {
        console.log("unity has loaded!");
        this.loaded = true;
        this.update();
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    setRegions(areasChanged = true) {
        if (!this.loaded) return;

        let regions = this.model.getRegions(this.state.mapping);
        let regionColors = this.model.getColors(this.state);
        if (!regionColors) this.dispatcher.spinning(this, false);

        // Construct the list of region acronyms and colors to send to Unity.
        let acronyms = []
        let colors = [];
        for (let regionIdx in regions) {
            let region = regions[regionIdx];

            // NOTE: make sure to skip Allen non-leaf regions.
            if (this.state.mapping == "allen" && !region['leaf']) continue;

            let acronym = region['acronym'];
            let h = region['atlas_id'] < 0 ? 'l' : 'r';
            acronym = h + acronym;
            acronyms.push(acronym);

            let color = (
                (regionColors ? regionColors[regionIdx] : null) ||
                (region["atlas_id"] > 0 ? '-' : '#ffffff'));
            colors.push(`${color.toUpperCase()}`);
        }

        if (acronyms) {
            if (areasChanged)
                this.instance.SendMessage('main', 'SetAreas', acronyms.toString());
            this.instance.SendMessage('main', 'SetColors', colors.toString());
        }
    }

    setExploded(value) {
        value = value || this.state.exploded;

        if (value == undefined) return;
        if (typeof value == "string")
            value = parseFloat(value);
        this.state.exploded = value;
        if (this.loaded) {
            this.instance.SendMessage('main', 'SetPercentageExploded', value);
        }
    }

    // Set the visibility of regions, for use when regions are selected
    setVisibility() {
        if (!this.loaded) return;

        let regions = this.model.getRegions(this.state.mapping);

        let visibility = [];
        let anySelected = this.state.selected.size > 0;

        if (anySelected) {
            for (let regionIdx in regions) {
                let region = regions[regionIdx];

                // NOTE: make sure to skip Allen non-leaf regions.
                if (this.state.mapping == "allen" && !region['leaf']) continue;

                // NOTE: regionIdx, as a key, is a string, but the set of selected idxs
                // contains integers, so we need to convert the string to an integer...
                visibility.push(this.state.selected.has(parseInt(regionIdx)));
            }
        }
        else {
            for (let regionIdx in regions) {
                visibility.push(true);
            }
        }

        // console.log(visibility.toString());
        this.instance.SendMessage('main', 'AreaSelected', anySelected ? 1 : 0);
        this.instance.SendMessage('main', 'SetVisibilities', visibility.toString());
    }

}
