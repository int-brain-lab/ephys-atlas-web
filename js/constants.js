
/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

export const DEBUG = (location.hostname === "localhost" || location.hostname === "127.0.0.1");
console.info("DEBUG:", DEBUG);

export const ENABLE_UNITY = true;

export const BASE_URL = DEBUG ? 'https://localhost:5000' : 'https://features.internationalbrainlab.org';

export const SLICE_MAX = {
    coronal: 1320,
    horizontal: 800,
    sagittal: 1140
};

export const SLICE_DEFAULT = {
    coronal: 1320 / 2,
    horizontal: 800 / 2,
    sagittal: 1140 / 2 - 20,
};

export const VOLUME_SIZE = {
    coronal: 528,
    horizontal: 320,
    sagittal: 456,
};

export const VOLUME_XY_AXES = {
    coronal: ["sagittal", "horizontal"],
    horizontal: ["sagittal", "coronal"],
    sagittal: ["coronal", "horizontal"],
}

// Volume brain atlas coordinate informations.
// x = ml, right positive       sagittal        idx=0: left
// y = ap, anterior positive    coronal         idx=0: anterior
// z = dv, dorsal positive      horizontal      idx=0: top

// coronal:
// x_img = +x_vol               sagittal
// y_img = -z_vol               horizontal

// horizontal:
// x_img = +x_vol               sagittal
// y_img = -y_vol               coronal

// sagittal:
// x_img = +y_vol               coronal
// y_img = -z_vol               horizontal

// const VOLUME_DX = 2.5e-05;
// const VOLUME_DY = -2.5e-05;
// const VOLUME_DZ = -2.5e-05;

const VOLUME_X0 = -0.005739;
const VOLUME_Y0 = 0.0054;
const VOLUME_Z0 = 0.000332;

const VOLUME_DF = 2.5e-05;

export function ij2xyz(axis, idx, i, j) {
    let d = VOLUME_DF;
    let x = 0;
    let y = 0;
    let z = 0;

    if (axis == "coronal") {
        x = VOLUME_X0 + i * d;
        y = VOLUME_Y0 - idx * d;
        z = VOLUME_Z0 - j * d;
    }
    else if (axis == "horizontal") {
        x = VOLUME_X0 + i * d;
        y = VOLUME_Y0 - j * d;
        z = VOLUME_Z0 - idx * d;
    }
    else if (axis == "sagittal") {
        x = VOLUME_X0 + idx * d;
        y = VOLUME_Y0 + i * d;
        z = VOLUME_Z0 - j * d;
    }

    return [x, y, z];
};

export function xyz2ij(axis, sliceIdx, xyz) {
    let i, j;

    if (axis === "coronal") {
        i = (xyz[0] - VOLUME_X0) / VOLUME_DF;
        j = -(xyz[2] - VOLUME_Z0) / VOLUME_DF;
    } else if (axis === "horizontal") {
        i = (xyz[0] - VOLUME_X0) / VOLUME_DF;
        j = -(xyz[1] - VOLUME_Y0) / VOLUME_DF;
    } else if (axis === "sagittal") {
        i = (xyz[1] - VOLUME_Y0) / VOLUME_DF;
        j = -(xyz[2] - VOLUME_Z0) / VOLUME_DF;
    }

    // // Check if the point is within the visible radius of the slice
    // let visibleRadius = 10; // Adjust this value as needed
    // let slicePlanePosition;
    // if (axis === "coronal") {
    //     slicePlanePosition = VOLUME_Y0 - sliceIdx * VOLUME_DF;
    // } else if (axis === "horizontal") {
    //     slicePlanePosition = VOLUME_Z0 - sliceIdx * VOLUME_DF;
    // } else if (axis === "sagittal") {
    //     slicePlanePosition = VOLUME_X0 + sliceIdx * VOLUME_DF;
    // }

    // let distanceToPlane;
    // if (axis === "coronal") {
    //     distanceToPlane = Math.abs(xyz[1] - slicePlanePosition);
    // } else if (axis === "horizontal") {
    //     distanceToPlane = Math.abs(xyz[2] - slicePlanePosition);
    // } else if (axis === "sagittal") {
    //     distanceToPlane = Math.abs(xyz[0] - slicePlanePosition);
    // }

    // if (distanceToPlane <= visibleRadius) {
    //     return [x, y]; // Return pixel coordinates if the point is visible
    // } else {
    //     return null; // Return null if the point is not visible
    // }

    // console.log(distanceToPlane);

    return [i, j];
}


export const VOLUME_AXES = ["coronal", "horizontal", "sagittal"]

export const SLICE_AXES = Object.keys(SLICE_MAX);
export const SLICE_STATIC_AXES = ['top', 'swanson'];
