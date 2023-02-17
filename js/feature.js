
/*************************************************************************************************/
/* Feature                                                                                       */
/*************************************************************************************************/

class Feature {
    constructor() {
        this.featureStyle = document.getElementById('feature-style');
        this.featureMin = document.querySelector('#bar-scale .min');
        this.featureMax = document.querySelector('#bar-scale .max');
    }

    async change(feature) {
        this.featureStyle.href = `data/regions_${feature}.css`;

        let min = await svgdb.getFeatureStat(feature, "min");
        this.featureMin.innerHTML = displayNumber(min);

        let max = await svgdb.getFeatureStat(feature, "max");
        this.featureMax.innerHTML = displayNumber(max);

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
};



/*************************************************************************************************/
/* Setup                                                                                         */
/*************************************************************************************************/

function setupFeatureDropdown() {
    const dropdown = getFeatureDropdown();
    dropdown.addEventListener('change', (e) => {
        let fet = e.target.value;
        feature.change(fet);
    });
}
