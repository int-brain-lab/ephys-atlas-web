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

    async setColors() {
        let regions = (await this.db.getRegions(this.state.mapping))['data'];
        if (!this.instance) return;

        // console.log(regions);
        for (let region of regions) {
            let regionIdx = region['idx'];
            let acronym = region['acronym'];
            let color = this.feature.getColor(regionIdx);
            if (color) {
                color = color.substring(1).toUpperCase();
                console.log(`in Unity, setting color of region #${regionIdx} (${acronym}) to #${color}`)
                this.instance.SendMessage('main', 'SetColor', `${acronym}:#${color}`);
            }
        }
    }

    async setVisibility() {
        let regions = (await this.db.getRegions(this.state.mapping))['data'];
        if (!this.instance) return;

        // console.log(regions);
        for (let region of regions) {
            let regionIdx = region['idx'];
            let acronym = region['acronym'];
            let v = this.state.selected.has(regionIdx);
            this.instance.SendMessage('main', 'SetVisibility', `${acronym}:#${v}`);
        }

        this.instance.SendMessage('main', 'ShowRoot', this.state.selected.length > 0 ? 1 : 0);
    }

    update() {
        // HACK: only update this view with the Beryl mapping.
        if (this.state.mapping == 'beryl') {
            this.setColors();
            this.setVisibility();
        }
    }

    loadedCallback() {
        this.update();
    }
}
