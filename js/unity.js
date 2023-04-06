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

    async setAreas() {
      let regions = (await this.db.getRegions(this.state.mapping))['data'];
      if (!this.instance) return;

      // console.log(regions);
      let acronyms = []

      for (let region of regions) {
          // let regionIdx = region['idx'];
          // let acronym = region['acronym'];
          let acronym = region['acronym'];

          if (region['atlas_id'] < 0) {
            acronym = 'l' + acronym;
          }
          else {
            acronym = 'r' + acronym;
          }
          acronyms.push(acronym);
          // if (color) {
          //     color = color.substring(1).toUpperCase();
          //     // console.debug(`in Unity, setting color of region #${regionIdx} (${acronym}) to #${color}`)
          //     acronyms.push(acronym);
          // }
      }

      this.instance.SendMessage('main', 'SetAreas', acronyms.toString());
    }

    async setColors() {
        let regions = (await this.db.getRegions(this.state.mapping))['data'];
        if (!this.instance) return;

        // console.log(regions);
        // let acronyms = []
        let colors = []

        for (let region of regions) {
            let regionIdx = region['idx'];
            // let acronym = region['acronym'];
            let color = this.feature.getColor(regionIdx);
            if (color) {
                // color = color.substring(1).toUpperCase();
                // console.debug(`in Unity, setting color of region #${regionIdx} (${acronym}) to #${color}`)
                // acronyms.push(acronym);
                colors.push(`${color.toUpperCase()}`);
                // this.instance.SendMessage('main', 'SetColor', `${acronym}:#${color}`);
            }
        }

        // this.instance.SendMessage('main', 'SetAreas', acronyms.toString());
        this.instance.SendMessage('main', 'SetColors', colors.toString());
    }

    async setVisibility() {
        let regions = (await this.db.getRegions(this.state.mapping))['data'];
        if (!this.instance) return;

        let visibility = [];

        if (this.state.selected.length > 0) {

        }
        // console.log(regions);
        for (let region of regions) {
            let regionIdx = region['idx'];
            // let acronym = region['acronym'];
            visibility.push(this.state.selected.has(regionIdx));
            // console.log(v);
            // this.instance.SendMessage('main', 'SetVisibility', `${acronym}:#${v}`);
        }

        if (visibility.length > 0) {
          this.instance.SendMessage('main', 'ShowRoot', this.state.selected.length > 0 ? 1 : 0);
          this.instance.SendMessage('main', 'SetVisibilities', visibility.toString());
        }

    }

    async update() {
        // HACK: only update this view with the Beryl mapping.
        if (this.state.mapping == 'beryl') {
          await this.setAreas();
          await this.setColors();
            // this.setColors();
          this.setVisibility();
        }
    }

    loadedCallback() {
        this.update();
    }
}
