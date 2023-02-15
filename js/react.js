'use strict';

const e = React.createElement;
const svgdb = new SVGDB();


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


function setSliceSVG(axis, idx) {
    svgdb[axis].get(idx).then((item) => {
        if (item) {
            let svg = item["svg"];
            document.getElementById(`figure-${axis}`).innerHTML = svg;
        }
    });
};
setSliceSVG = throttle(setSliceSVG, 15);


function Slider({ axis, sliceInit, sliceMax }) {
    const [slice, setSlice] = React.useState(sliceInit);

    return e(
        'input',
        {
            onChange: (ev) => {
                let idx = Math.floor(ev.target.value);
                setSlice(idx);
                setSliceSVG(axis, idx);
            },
            type: "range",
            className: "slider",
            id: `slider-${axis}`,
            min: 0,
            max: sliceMax,
            step: 2,
            value: slice,
        }
    );
};


function addSlider(axis, sliceMax) {
    ReactDOM.createRoot(document.getElementById(`slider-${axis}-container`)).render(
        e(Slider, { axis: axis, sliceInit: sliceMax / 2, sliceMax: sliceMax - 1 }));
};


addSlider("coronal", 1320);
addSlider("sagittal", 1140);
addSlider("horizontal", 800);


function Bar({ highlightedInit, selectedInit }) {
    const [highlighted, setHighlighted] = React.useState(highlightedInit);

    return e(
        'div',
        {
            innerHTML: highlighted,
        }
    );
};




/*
STATE

bar
    highlighted region
    selected regions

*/
