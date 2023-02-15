
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
