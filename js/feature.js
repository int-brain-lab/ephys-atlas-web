
/*************************************************************************************************/
/* Feature                                                                                       */
/*************************************************************************************************/

const DEFAULT_FEATURE = "psd_alpha";
const DEFAULT_STAT = "mean";
const DEFAULT_COLORMAP = "viridis";


async function downloadFeatures(name) {
    return downloadJSON(`/data/json/features_${name}.json`);
}



function normalize_value(value, vmin, vmax) {
    console.assert(vmin < vmax);
    value = clamp(value, vmin, vmax);

    let normalized = Math.floor(100 * (value - vmin) / (vmax - vmin));
    console.assert(normalized >= 0);
    console.assert(normalized <= 100);

    return normalized;
}



function make_hex(cmap, normalized) {
    return COLORMAPS[cmap][clamp(normalized, 0, 99)];
}



function make_region_color(cmap, region_idx, value, normalized) {
    let hex = make_hex(cmap, normalized);
    return `svg path.region_${region_idx} { fill: ${hex}; } /* FRP5: ${value} */`;
}



function make_region_bar(region_idx, value, normalized) {
    return `#bar-plot li.region_${region_idx} .bar { width: ${normalized}%; } /* TTv: ${value} */`;
}



// One instance per feature set.
class Feature {
    constructor() {
        // this.featureStyle = document.getElementById('feature-style');
        this.featureMin = document.querySelector('#bar-scale .min');
        this.featureMax = document.querySelector('#bar-scale .max');
        this.stat = DEFAULT_STAT;
        this.cmap = DEFAULT_COLORMAP;

        this.style = document.getElementById('style-features').sheet;

        this.set_feature_set("ephys").then(() => {
            let fet_name = DEFAULT_FEATURE;
            this.set_feature(fet_name);

            // ***** SPLASH *****
            SPLASH.add(10);
            // ***** SPLASH *****

            this.update();
        });
    }

    async set_feature_set(fet_set) {
        // mapping fet_name: {data: {id: {mean...}, statistics: {mean: xxx, ...}}
        this.features = await downloadFeatures(fet_set || "ephys");
    }

    update() {
        // mapping {data: {id: {mean...}, statistics: {mean: xxx, ...}}
        let fet = this.features[this.fet_name];
        let stats = fet["statistics"];

        // mapping {idx: {mean...}, statistics: {mean: xxx, ...}
        let data = fet["data"];

        let vmin = stats[this.stat]["min"];
        let vmax = stats[this.stat]["max"];

        clearStyle(this.style);
        let stl = "";
        for (let region_idx in data) {
            let value = data[region_idx][this.stat];
            let normalized = normalize_value(value, vmin, vmax);

            stl = make_region_color(this.cmap, region_idx, value, normalized);
            this.style.insertRule(stl);

            stl = make_region_bar(region_idx, value, normalized);
            this.style.insertRule(stl);
        }

        this.featureMin.innerHTML = displayNumber(vmin);
        this.featureMax.innerHTML = displayNumber(vmax);

        this.update_unity();
    }

    update_unity() {
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

    // Change a feature within the current feature set.
    set_feature(fet_name) {
        this.fet_name = fet_name;
        this.update();
    }

    // set the stat: mean, std, min, max
    set_stat(stat) {
        this.stat = stat;
        this.update();
    }

    set_colormap(cmap) {
        this.cmap = cmap;
        this.update();
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

function setupColormapDropdown() {
    const dropdown = getColormapDropdown();
    dropdown.addEventListener('change', (e) => {
        let fet = e.target.value;
        FEATURE.set_colormap(fet);
    });
}

function setupStatDropdown() {
    const dropdown = getStatDropdown();
    dropdown.addEventListener('change', (e) => {
        let fet = e.target.value;
        FEATURE.set_stat(fet);
    });
}
