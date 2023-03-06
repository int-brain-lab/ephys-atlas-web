
/*************************************************************************************************/
/* Feature                                                                                       */
/*************************************************************************************************/

async function downloadFeatures(name) {
    return downloadJSON(`/data/json/features_${name}.json`);
}



// One instance per feature set.
class Feature {
    constructor() {
        this.featureStyle = document.getElementById('feature-style');
        this.featureMin = document.querySelector('#bar-scale .min');
        this.featureMax = document.querySelector('#bar-scale .max');
        this.stat = "mean";

        this.set_set("ephys").then(() => {
            let fet_name = Object.keys(this.features)[0];
            this.set_feature(fet_name);

            // ***** SPLASH *****
            SPLASH.add(10);
            // ***** SPLASH *****
        });
    }

    async set_set(fet_set) {
        // mapping fet_name: {data: {id: {mean...}, statistics: {mean: xxx, ...}}
        this.features = await downloadFeatures(fet_set || "ephys");
    }

    // Change a feature within the current feature set.
    set_feature(fet_name) {
        // TODO: update the CSS colormap

        // mapping {data: {id: {mean...}, statistics: {mean: xxx, ...}}
        this.fet_name = fet_name;
        let fet = this.features[fet_name];
        let data = fet["data"];
        let stats = fet["statistics"];

        this.featureMin.innerHTML = displayNumber(stats["min"]);
        this.featureMax.innerHTML = displayNumber(stats["max"]);

        // Update Unity.
        if (window.unity) {
            for (const [idx, acronym] of Object.entries(REGIONS)) {
                let p = document.querySelector(`path.region_${idx}`);
                if (!p) continue;
                let color = window.getComputedStyle(p).fill;
                let hexcode = rgb2hex(color);
                // console.log(acronym, hexcode);
                window.unity.SendMessage('main', 'SetColor', `${acronym}:${hexcode}`);
            }
        }
    }

    // set the stat: mean, std, min, max
    set_stat(stat) {
        this.stat = stat;
    }

    get(region_idx) {
        let fet = this.features[this.fet_name];
        let data = fet["data"];
        if (data && data[region_idx])
            return data[region_idx][this.stat];
    }
};



/*************************************************************************************************/
/* Setup                                                                                         */
/*************************************************************************************************/

function setupFeatureDropdown() {
    const dropdown = getFeatureDropdown();
    dropdown.addEventListener('change', (e) => {
        let fet = e.target.value;
        FEATURE.set_feature(fet);
    });
}
