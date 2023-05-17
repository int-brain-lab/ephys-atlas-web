export { Unity };



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const UNITY_SPLASH_TOTAL = 50;



/*************************************************************************************************/
/* Unity                                                                                         */
/*************************************************************************************************/

class Unity {
    constructor(splash, db, state, region, feature) {
        console.log("setting up Unity");

        this.splash = splash;
        this.db = db;
        this.state = state;
        this.region = region;
        this.feature = feature;
        this.instance = null;

        // Declare the total splash progress for this component.
        this.total
        this.splash.addTotal(UNITY_SPLASH_TOTAL);

        this.setupSlider();
    }

    init() {
        let that = this;
        createUnityInstance(document.getElementById("unity-canvas"), {
            dataUrl: "Build/webgl.data.gz",
            frameworkUrl: "Build/webgl.framework.js.gz",
            codeUrl: "Build/webgl.wasm.gz",
            companyName: "Daniel Birman @ UW",
            productName: "ephys_atlas",
            productVersion: "0.1.0",
        }).then((unityInstance) => {
            that.instance = unityInstance;
        });
    }

    setExploded(value) {
        if (value == undefined) return;
        if (typeof value == "string")
            value = parseFloat(value);
        this.state.exploded = value;
        if (this.instance) {
            this.instance.SendMessage('main', 'SetPercentageExploded', value);
        }
    }

    setupSlider() {
        this.slider = document.getElementById('slider-unity');
        this.slider.value = this.state.exploded;

        this.slider.oninput = (e) => {
            this.setExploded(e.target.value);
        };
    }

    // Tell Unity what mapping we are using
    async setAreas() {
        if (!this.instance) return;

        let regions = this.db.getRegions(this.state.mapping);

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
    }

    // Set the colors for the current mapping
    async setColors() {
        if (!this.instance) return;

        let regions = this.db.getRegions(this.state.mapping);

        let colors = []
        for (let regionIdx in regions) {
            let color = this.feature.getColor(regionIdx)
            let region = regions[regionIdx];
            if (!color) {
                if (region.atlas_id > 0) {
                    color = '-';
                }
                else {
                    color = '#FFFFFF';
                }
            }
            colors.push(`${color.toUpperCase()}`);
        }

        this.instance.SendMessage('main', 'SetColors', colors.toString());
    }

    // Set the visibility of regions, for use when regions are selected
    async setVisibility() {
        if (!this.instance) return;

        let regions = this.db.getRegions(this.state.mapping);

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

        this.instance.SendMessage('main', 'AreaSelected', anySelected ? 1 : 0);
        this.instance.SendMessage('main', 'SetVisibilities', visibility.toString());
        this.setExploded(this.state.exploded);
    }

    async update() {
        await this.setAreas();
        this.setExploded();
        this.setVisibility();
        this.setColors();
    }

    loadedCallback() {
        console.log("unity has loaded!");
        this.splash.add(UNITY_SPLASH_TOTAL);
        this.update();
    }
}
