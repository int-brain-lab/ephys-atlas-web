'use strict';

const e = React.createElement;

function Slider({ axis, sliceInit, sliceMax }) {
    const [slice, setSlice] = React.useState(sliceInit);

    return e(
        'input',
        {
            onChange: (ev) => {
                setSlice(ev.target.value);
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
}

const root = ReactDOM.createRoot(document.getElementById("slider-coronal-container"));
root.render(e(Slider, { sliceInit: 660, sliceMax: 1319 }));

/*
STATE

region selector
    highlighted region
    selected regions

coronal/sagittal/horizontal SVG
    slice idx





*/
