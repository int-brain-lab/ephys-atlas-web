
/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

SLICE_MAX = {
    coronal: 1320,
    horizontal: 800,
    sagittal: 1140
}



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

function getSlider(axis) {
    return document.getElementById(`slider-${axis}`);
}



function throttle(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function () {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
    };
    return function () {
        var now = Date.now();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };
};



/*************************************************************************************************/
/* Slicing                                                                                       */
/*************************************************************************************************/

function setSliceSVG(axis, idx) {
    svgdb.getSlice(axis, idx);
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

    svg.addEventListener('wheel', function (ev) {
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