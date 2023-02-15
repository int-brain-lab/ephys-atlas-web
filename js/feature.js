
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
    }

    change(feature) {
        this.featureStyle.href = `data/regions_${feature}.css`;
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
