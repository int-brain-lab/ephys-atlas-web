
/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

SLICE_MAX = {
    coronal: 1320,
    horizontal: 800,
    sagittal: 1140
}



/*************************************************************************************************/
/* Slicing                                                                                       */
/*************************************************************************************************/

function setSliceSVG(axis, idx) {
    SVG.getSlice(axis, idx);

    if (axis == 'sagittal') {
        let x = idx / SLICE_MAX[axis];
        x = clamp(x, .05, .95);

        let v = 236 + 225 * (x - .5);
        document.getElementById('top-vline').setAttribute("x1", v);
        document.getElementById('top-vline').setAttribute("x2", v);

        let w = 237 + 341 * (x - .5);
        document.getElementById('coronal-vline').setAttribute("x1", w);
        document.getElementById('coronal-vline').setAttribute("x2", w);

        let t = 237 + 215 * (x - .5);
        document.getElementById('horizontal-vline').setAttribute("x1", t);
        document.getElementById('horizontal-vline').setAttribute("x2", t);

        // ML coordinate.
        document.getElementById('coord-ml').innerHTML = (-5739 + 10 * idx);
    }

    else if (axis == 'coronal') {
        let y = idx / SLICE_MAX[axis];

        let v = 174 + 268 * (y - .5);
        document.getElementById('top-hline').setAttribute("y1", v);
        document.getElementById('top-hline').setAttribute("y2", v);

        let w = 236 + 352 * (y - .5);
        document.getElementById('sagittal-vline').setAttribute("x1", w);
        document.getElementById('sagittal-vline').setAttribute("x2", w);

        let t = 174 + 264 * (y - .5);
        document.getElementById('horizontal-hline').setAttribute("y1", t);
        document.getElementById('horizontal-hline').setAttribute("y2", t);

        // AP coordinate.
        document.getElementById('coord-ap').innerHTML = (5400 - 10 * idx);
    }

    else if (axis == 'horizontal') {
        let y = idx / SLICE_MAX[axis];

        let v = 169 + 224 * (y - .5);
        document.getElementById('coronal-hline').setAttribute("y1", v);
        document.getElementById('coronal-hline').setAttribute("y2", v);

        let w = 170 + 198 * (y - .5);
        document.getElementById('sagittal-hline').setAttribute("y1", w);
        document.getElementById('sagittal-hline').setAttribute("y2", w);

        // DV coordinate.
        document.getElementById('coord-dv').innerHTML = (332 - 10 * idx);
    }
};
setSliceSVG = throttle(setSliceSVG, 15);



/*************************************************************************************************/
/* Setup                                                                                         */
/*************************************************************************************************/

function setupSlider(axis) {
    let slider = getSlider(axis);

    slider.oninput = (ev) => {
        let idx = Math.floor(slider.value);
        setSliceSVG(axis, idx);
    };

    let svg = getSVG(axis);
    let max = SLICE_MAX[axis];

    svg.parentNode.addEventListener('wheel', function (ev) {
        ev.preventDefault();

        // Update the slider.
        let x = ev.deltaY;
        // HACK: handle scrolling with touchpad on mac
        let k = getOS() == "macOS" ? 4 : 24;
        if (x == 0) return;
        else if (x < 0)
            slider.valueAsNumber += k;
        else if (x > 0)
            slider.valueAsNumber -= k;
        slider.valueAsNumber = Math.min(max, Math.max(0, slider.valueAsNumber));

        setSliceSVG(axis, slider.valueAsNumber);
    }, { passive: false });
};
