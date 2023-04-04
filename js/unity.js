export { Unity };

class Unity {
    constructor(region, feature) {
        console.debug("setup Unity");

        this.region = region;
        this.feature = feature;
        this.instance = null;
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

    async setColors() {
        let regions = (await this.region.db.getRegions(this.region.state.mapping))['data'];
        // console.log(regions);
        for (let region of regions) {
            let regionIdx = region['idx'];
            let acronym = region['acronym'];
            let color = this.feature.getColor(regionIdx);
            if (color) {
                color = color.substring(1).toUpperCase();
                console.log(`in Unity, setting color of region #${regionIdx} (${acronym}) to #${color}`)
                this.instance.SendMessage('main', 'SetColor', `${acronym}:#${color}`);
                // this.instance.SendMessage('main', 'SetVisibility', 'VISp:false');
            }
        }
    }

    loadedCallback() {
        this.setColors();
    }
}
