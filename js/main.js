
const splash = new Splash();
const svgdb = new SVGDB();
const feature = new Feature();
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

setupFeatureDropdown();
setupUnity();
