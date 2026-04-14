function clampToRange(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function getMouseRelativePosition(rect, eventPoint) {
    if (!rect || !eventPoint || !rect.width || !rect.height) {
        return null;
    }

    return {
        x: clampToRange((eventPoint.clientX - rect.left) / rect.width, 0, 1),
        y: clampToRange((eventPoint.clientY - rect.top) / rect.height, 0, 1),
    };
}

export function getMouseVolumeCoords(axis, sliceIdx, eventPoint, rect, volumeSize, volumeAxes, ij2xyzFn) {
    const relative = getMouseRelativePosition(rect, eventPoint);
    if (!relative || !volumeAxes[axis]) {
        return null;
    }

    const i = volumeSize[volumeAxes[axis][0]] * relative.x;
    const j = volumeSize[volumeAxes[axis][1]] * relative.y;
    return ij2xyzFn(axis, sliceIdx, i, j);
}

export function projectVolumeCoordsToPixels(axis, xyz, canvasSize, volumeSize, xyz2ijFn) {
    if (!canvasSize || !canvasSize.width || !canvasSize.height) {
        return null;
    }

    const [i, j] = xyz2ijFn(axis, null, xyz);
    let x;
    let y;
    if (axis === 'coronal') {
        x = (i / volumeSize.sagittal) * canvasSize.width;
        y = (j / volumeSize.horizontal) * canvasSize.height;
    }
    else if (axis === 'horizontal') {
        x = (i / volumeSize.sagittal) * canvasSize.width;
        y = (j / volumeSize.coronal) * canvasSize.height;
    }
    else if (axis === 'sagittal') {
        x = (i / volumeSize.coronal) * canvasSize.width;
        y = (j / volumeSize.horizontal) * canvasSize.height;
    }
    else {
        return null;
    }

    return [x, y];
}

export function findClosestPointIndex(points, point) {
    if (points.length % 3 !== 0) {
        throw new Error('Invalid input: points array length must be a multiple of 3.');
    }
    if (point.length !== 3) {
        throw new Error('Invalid input: point must contain three coordinates (x, y, z).');
    }

    let closestIndex = -1;
    let closestDistance = Infinity;

    for (let i = 0; i < points.length; i += 3) {
        const xDiff = points[i] - point[0];
        const yDiff = points[i + 1] - point[1];
        const zDiff = points[i + 2] - point[2];
        const distance = xDiff * xDiff + yDiff * yDiff + zDiff * zDiff;

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i / 3;
        }
    }

    return closestIndex;
}

export function getPointTriplet(points, pointIdx) {
    if (pointIdx < 0) {
        return null;
    }
    return [
        points[3 * pointIdx + 0],
        points[3 * pointIdx + 1],
        points[3 * pointIdx + 2],
    ];
}
