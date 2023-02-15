
const svgdb = new SVGDB();
const highlighter = new Highlighter();
const selector = new Selector();

setupSVGHighlighting('coronal');
setupSVGHighlighting('sagittal');
setupSVGHighlighting('horizontal');
setupSVGHighlighting('top');
setupSVGHighlighting('swanson');

setupSVGSelection('coronal');
setupSVGSelection('sagittal');
setupSVGSelection('horizontal');
setupSVGSelection('top');
setupSVGSelection('swanson');

setupBarHighlighting();
setupBarSelection();

setupSlider('coronal');
setupSlider('sagittal');
setupSlider('horizontal');

var dropdown = document.getElementById("feature-dropdown");
var featureStyle = document.getElementById("feature-style");
dropdown.addEventListener('change', (e) => {
    let feature = e.target.value;
    featureStyle.href = `data/regions_${feature}.css`;
});
