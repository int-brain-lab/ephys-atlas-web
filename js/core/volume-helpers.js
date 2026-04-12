export function computeAxisMapping(shape, canonicalSizes, axisNames = ["coronal", "horizontal", "sagittal"]) {
    const canonical = axisNames.map((axis) => canonicalSizes[axis]);
    const permutations = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
    ];

    let best = null;
    for (const perm of permutations) {
        const dims = perm.map(idx => shape[idx]);
        if (dims.some(d => !isFinite(d) || d <= 0)) {
            continue;
        }
        const ratios = dims.map((d, idx) => canonical[idx] / d);
        if (ratios.some(r => !isFinite(r) || r <= 0)) {
            continue;
        }
        const errors = ratios.map(r => Math.abs(Math.round(r) - r));
        const totalError = errors.reduce((a, b) => a + b, 0);
        const maxError = Math.max(...errors);
        if (best === null || totalError < best.totalError || (totalError === best.totalError && maxError < best.maxError)) {
            best = { perm, dims, ratios, totalError, maxError };
        }
    }

    if (!best) {
        const axisToRaw = Object.fromEntries(axisNames.map((axis, idx) => [axis, idx]));
        const rawToAxis = Object.fromEntries(axisNames.map((axis, idx) => [idx, axis]));
        return {
            axisToRaw,
            rawToAxis,
            axisSizes: Object.fromEntries(axisNames.map((axis, idx) => [axis, shape[idx]])),
            downsample: Object.fromEntries(axisNames.map((axis) => [axis, 1])),
        };
    }

    const axisToRaw = Object.fromEntries(axisNames.map((axis, idx) => [axis, best.perm[idx]]));
    const rawToAxis = Object.fromEntries(Object.entries(axisToRaw).map(([axis, rawIdx]) => [rawIdx, axis]));
    const axisSizes = Object.fromEntries(axisNames.map((axis) => [axis, shape[axisToRaw[axis]]]));
    const downsample = Object.fromEntries(axisNames.map((axis, idx) => [axis, canonical[idx] / axisSizes[axis]]));

    return {
        axisToRaw,
        rawToAxis,
        axisSizes,
        downsample,
    };
}
