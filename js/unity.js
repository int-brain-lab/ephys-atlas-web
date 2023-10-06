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

    async update() {
        await this.setAreas();
        this.setExploded();
        this.setVisibility();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDispatcher() {
        this.dispatcher.on('colors', (ev) => {
            if (!this.instance) return;
            this.setColors(ev.colors);
        });
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
        // this.splash.add(UNITY_SPLASH_TOTAL);
        this.update();
    }

    setColors(regionColors) {
        let regions = this.model.getRegions(this.state.mapping);

        let colors = []
        for (let regionIdx in regions) {
            let region = regions[regionIdx];
            let color = (
                (regionColors ? regionColors[regionIdx] : null) ||
                (region.atlas_id > 0 ? '-' : '#FFFFFF'));
            colors.push(`${color.toUpperCase()}`);
        }

        // NOTE: how to reset the colors?
        this.instance.SendMessage('main', 'SetColors', colors.toString());
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    setExploded(value) {
        if (value == undefined) return;
        if (typeof value == "string")
            value = parseFloat(value);
        this.state.exploded = value;
        if (this.instance) {
            this.instance.SendMessage('main', 'SetPercentageExploded', value);
        }
    }

    // Tell Unity what mapping we are using
    setAreas() {
        if (!this.instance) return;

        let regions = this.model.getRegions(this.state.mapping);

        // Construct the list of region acronyms to send to Unity.
        let acronyms = []
        for (let regionIdx in regions) {
            let region = regions[regionIdx];
            let acronym = region['acronym'];
            let h = region['atlas_id'] < 0 ? 'l' : 'r';
            acronym = h + acronym;
            acronyms.push(acronym);
        }

        this.instance.SendMessage('main', 'SetAreas', acronyms.toString());

        // HACK: trigger a callback in the Coloring module that will compute the colors, and pass
        // them to the setColors() method here via the "colors" event.
        this.dispatcher.unityLoaded(this, this.instance);
    }

    // Set the visibility of regions, for use when regions are selected
    setVisibility() {
        if (!this.instance) return;

        let regions = this.model.getRegions(this.state.mapping);

        let visibility = [];
        let anySelected = this.state.selected.size > 0;

        if (anySelected) {
            for (let regionIdx in regions) {
                visibility.push(this.state.selected.has(regionIdx));
            }
        }
        else {
            for (let region in regions) {
                visibility.push(true);
            }
        }

        // this.instance.SendMessage('main', 'AreaSelected', anySelected ? 1 : 0);
        this.instance.SendMessage('main', 'SetVisibilities', visibility.toString());
        this.setExploded(this.state.exploded);
    }

}
