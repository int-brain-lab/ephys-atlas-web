const ENABLE_UNITY = false;

window.unity = null;

const SPLASH = new Splash();
SPLASH.start();
SPLASH.set(0);

const FEATURE = new Feature();
const SVG = new SVGDB();

const HIGHLIGHTER = new Highlighter();
const SELECTOR = new Selector();

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
setupColormapDropdown();

if (ENABLE_UNITY) {
    setupUnity();
}
