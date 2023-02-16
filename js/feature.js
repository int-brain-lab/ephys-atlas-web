
/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

function getFeatureDropdown() {
    return document.getElementById('feature-dropdown');
};



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
        this.featureMin.innerHTML = min.toPrecision(4);

        let max = await svgdb.getFeatureStat(feature, "max");
        this.featureMax.innerHTML = max.toPrecision(4);
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
