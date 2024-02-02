
/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

export const DEBUG = (location.hostname === "localhost" || location.hostname === "127.0.0.1");
console.info("DEBUG:", DEBUG);

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

export const VOLUME_AXES = ["coronal", "horizontal", "sagittal"]

export const SLICE_AXES = Object.keys(SLICE_MAX);
export const SLICE_STATIC_AXES = ['top', 'swanson'];
