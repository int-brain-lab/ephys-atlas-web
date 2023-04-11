export { Unity };

class Unity {
    constructor(db, state, region, feature) {
        console.log("setting up Unity");

        // DEBUG
        // return;

        this.db = db;
        this.state = state;
        this.region = region;
        this.feature = feature;
        this.instance = null;

        this.setupSlider();

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
            console.log("Unity loaded");
        });
    }

    setExploded(value) {
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

        let regions = (await this.db.getRegions(this.state.mapping))['data'];

        // Construct the list of region acronyms to send to Unity.
        let acronyms = []
        for (let region of regions) {
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

        let regions = (await this.db.getRegions(this.state.mapping))['data'];

        let colors = []
        for (let region of regions) {
            let regionIdx = region['idx'];
            let color = this.feature.getColor(regionIdx) || '#FFFFFF';
            colors.push(`${color.toUpperCase()}`);
        }

        this.instance.SendMessage('main', 'SetColors', colors.toString());
    }

    // Set the visibility of regions, for use when regions are selected
    async setVisibility() {
        if (!this.instance) return;

        let regions = (await this.db.getRegions(this.state.mapping))['data'];

        let visibility = [];
        let anySelected = this.state.selected.size > 0;

        if (anySelected) {
            for (let region of regions) {
                let regionIdx = region['idx'];
                visibility.push(this.state.selected.has(regionIdx));
            }
        }
        else {
            for (let region of regions) {
                visibility.push(true);
            }
        }

        this.instance.SendMessage('main', 'ShowRoot', anySelected ? 1 : 0);
        this.instance.SendMessage('main', 'SetVisibilities', visibility.toString());
        this.setExploded(this.state.exploded);
    }

    async update() {
        await this.setAreas();
        this.setColors();
        this.setVisibility();
    }

    loadedCallback() {
        this.update();
    }
}
