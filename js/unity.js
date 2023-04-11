export { Unity };

class Unity {
    constructor(db, state, region, feature) {
        console.log("setting up Unity");

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

    setupSlider() {
        this.slider = document.getElementById('slider-unity');

        this.slider.oninput = (e) => {
            let value = e.target.value / 100.0;
            if (this.instance) {
                this.instance.SendMessage('main', 'SetPercentageExploded', value);
            }
        };

    }

    // Tell Unity what mapping we are using
    async setAreas() {
        if (!this.instance) return;

        let regions = (await this.db.getRegions(this.state.mapping))['data'];

        // console.log(regions);
        let acronyms = []

        for (let region of regions) {
            let acronym = region['acronym'];

            if (region['atlas_id'] < 0) {
                acronym = 'l' + acronym;
            }
            else {
                acronym = 'r' + acronym;
            }
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
            // let acronym = region['acronym'];
            let color = this.feature.getColor(regionIdx);
            if (color) {
                colors.push(`${color.toUpperCase()}`);
            }
            else {
                colors.push('#FFFFFF');
            }
        }

        this.instance.SendMessage('main', 'SetColors', colors.toString());
    }

    // Set the visibility of regions, for use when regions are selected
    async setVisibility() {
        if (!this.instance) return;

        let regions = (await this.db.getRegions(this.state.mapping))['data'];

        let visibility = [];
        let anySelected = app.state.selected.size > 0;

        if (anySelected) {
            // console.log(regions);
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
    }

    async update() {
        await this.setAreas();
        await this.setColors();
        this.setVisibility();
    }

    loadedCallback() {
        this.update();
    }
}
