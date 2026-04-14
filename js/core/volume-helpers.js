function clampToRange(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function hexColorToRgb(hexColor) {
    const normalized = hexColor.replace(/^#/, '');
    return [
        parseInt(normalized.substring(0, 2), 16),
        parseInt(normalized.substring(2, 4), 16),
        parseInt(normalized.substring(4, 6), 16),
    ];
}

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

export function indexFromAxisCoords(axisCoords, rawToAxis, shape, fortranOrder, axisNames = ["coronal", "horizontal", "sagittal"]) {
    if (!shape || shape.length !== 3) {
        return null;
    }

    const coordsRaw = [0, 0, 0];
    for (let raw = 0; raw < 3; raw++) {
        const axisName = rawToAxis ? rawToAxis[raw] : axisNames[raw];
        const axisIdx = axisNames.indexOf(axisName);
        if (axisIdx < 0) {
            return null;
        }
        coordsRaw[raw] = axisCoords[axisIdx];
    }

    const [s0, s1, s2] = shape;
    if (fortranOrder) {
        return coordsRaw[0] + s0 * (coordsRaw[1] + s1 * coordsRaw[2]);
    }
    return coordsRaw[0] * s1 * s2 + coordsRaw[1] * s2 + coordsRaw[2];
}

export function getVolumePlaneSize(axis, axisSizes, xyAxes) {
    if (!axisSizes || !xyAxes[axis]) {
        return null;
    }
    const [widthAxis, heightAxis] = xyAxes[axis];
    return {
        widthAxis,
        heightAxis,
        width: axisSizes[widthAxis],
        height: axisSizes[heightAxis],
        sliceCount: axisSizes[axis],
    };
}

export function getVolumeHoverAxisCoords(axis, rect, eventPoint, axisSizes, xyAxes, sliceIndex, axisNames = ["coronal", "horizontal", "sagittal"]) {
    if (!axis || !rect || !eventPoint || !axisSizes) {
        return null;
    }
    if (!rect.width || !rect.height) {
        return null;
    }

    const plane = getVolumePlaneSize(axis, axisSizes, xyAxes);
    if (!plane || !plane.width || !plane.height) {
        return null;
    }

    const relativeX = clampToRange((eventPoint.clientX - rect.left) / rect.width, 0, 1);
    const relativeY = clampToRange((eventPoint.clientY - rect.top) / rect.height, 0, 1);
    const widthCoord = clampToRange(Math.floor(relativeX * plane.width), 0, plane.width - 1);
    const heightCoord = clampToRange(Math.floor(relativeY * plane.height), 0, plane.height - 1);

    const axisCoords = [0, 0, 0];
    axisCoords[axisNames.indexOf(axis)] = sliceIndex;
    axisCoords[axisNames.indexOf(plane.widthAxis)] = widthCoord;
    axisCoords[axisNames.indexOf(plane.heightAxis)] = heightCoord;
    return axisCoords;
}

export function denormalizeVolumeValue(rawValue, bounds) {
    if (rawValue == null) {
        return rawValue;
    }
    if (!bounds || bounds.length < 2) {
        return rawValue;
    }

    const min = bounds[0];
    const max = bounds[1];
    if (!isFinite(min) || !isFinite(max) || max <= min) {
        return rawValue;
    }

    return min + (rawValue / 255) * (max - min);
}
