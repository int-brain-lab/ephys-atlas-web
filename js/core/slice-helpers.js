function clampToRange(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function isRootTarget(target, rootClass = 'beryl_region_1') {
    return !!(target && target.classList && target.classList.contains(rootClass));
}

export function getSliceWheelStep(osName) {
    return osName === 'macOS' ? 4 : 24;
}

export function getNextSliceSliderValue(currentValue, deltaY, max, osName) {
    const step = getSliceWheelStep(osName);
    if (deltaY === 0) {
        return currentValue;
    }
    const next = deltaY < 0 ? currentValue + step : currentValue - step;
    return clampToRange(next, 0, max);
}

export function getSagittalGuideState(idx, max) {
    const clamped = clampToRange(idx, 10, max - 10);
    const ratio = clamped / max;
    return {
        topX: 236 + 225 * (ratio - 0.5),
        coronalX: 237 + 354 * (ratio - 0.5),
        horizontalX: 237 + 230 * (ratio - 0.5),
        ml: -5739 + 10 * clamped,
    };
}

export function getCoronalGuideState(idx, max) {
    const clamped = clampToRange(idx, 10, max - 10);
    const ratio = clamped / max;
    return {
        topY: 174 + 268 * (ratio - 0.5),
        sagittalX: 236 + 354 * (ratio - 0.5),
        horizontalY: 174 + 264 * (ratio - 0.5),
        ap: 5400 - 10 * clamped,
    };
}

export function getHorizontalGuideState(idx, max) {
    const ratio = idx / max;
    return {
        coronalY: 174 + 242 * (ratio - 0.5),
        sagittalY: 174 + 210 * (ratio - 0.5),
        dv: 332 - 10 * idx,
    };
}
