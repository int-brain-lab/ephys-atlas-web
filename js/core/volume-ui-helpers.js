export function buildVolumeVisibilityRules(hidden) {
    const pathStyle = hidden ? 'fill-opacity: 0%; stroke: #ccc;' : 'fill-opacity: 100%; stroke: #0;';
    const rules = [
        `#svg-coronal-container svg path { ${pathStyle} }\n`,
        `#svg-horizontal-container svg path { ${pathStyle} }\n`,
        `#svg-sagittal-container svg path { ${pathStyle} }\n`,
    ];

    if (!hidden) {
        rules.push('#canvas-coronal { visibility: hidden; }\n');
        rules.push('#canvas-horizontal { visibility: hidden; }\n');
        rules.push('#canvas-sagittal { visibility: hidden; }\n');
    }

    return rules;
}

export function getVolumeSliderMax(voxels, downsample = 1) {
    return Math.round(voxels * 2.5 * downsample);
}

export function getVolumeSliceIndex(sliderValue, downsample, sliceCount) {
    if (!isFinite(sliceCount) || sliceCount <= 0) {
        return 0;
    }
    return Math.min(sliceCount - 1, Math.max(0, Math.floor(sliderValue / (2.5 * downsample))));
}
