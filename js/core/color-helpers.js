import { clamp, normalizeValue } from "../utils.js";

export const HEMISPHERE_SPLIT_INDEX = 1327;
export const MISSING_REGION_COLOR = '#ffffff';
export const NULL_VALUE_COLOR = '#d3d3d3';
const HISTOGRAM_RANGE_STATS = new Set(["mean", "count", "max", "median", "min"]);

export function resolveFeatureRange(features, stat, histogram) {
    let vmin = features?.statistics ? features.statistics[stat]?.min ?? 0 : 0;
    let vmax = features?.statistics ? features.statistics[stat]?.max ?? 1 : 1;

    if (features && HISTOGRAM_RANGE_STATS.has(stat) && histogram) {
        if (histogram.vmin != null) vmin = histogram.vmin;
        if (histogram.vmax != null) vmax = histogram.vmax;
    }

    return { vmin, vmax };
}

export function getHemisphereAvailability(featureKeys, idxSplit = HEMISPHERE_SPLIT_INDEX) {
    if (!featureKeys?.length) {
        return null;
    }

    const numericKeys = featureKeys.map((key) => Number(key));
    const featureMax = Math.max(...numericKeys);
    const featureMin = Math.min(...numericKeys);

    return {
        hasLeft: featureMax > idxSplit,
        hasRight: featureMin <= idxSplit,
    };
}

export function normalizeFeatureValue(value, vmin, vmax, cmin, cmax, logScale) {
    const vdiff = vmax - vmin;
    const vminMod = vmin + vdiff * cmin / 100.0;
    const vmaxMod = vmin + vdiff * cmax / 100.0;
    let normalized = normalizeValue(value, vminMod, vmaxMod);

    if (logScale) {
        normalized = Math.round(100.0 * Math.pow(normalized / 100.0, 0.25));
    }

    return normalized;
}

export function buildRegionColors({
    regions,
    features,
    stat,
    cmin,
    cmax,
    logScale,
    colors,
    histogram = null,
    idxSplit = HEMISPHERE_SPLIT_INDEX,
}) {
    const featureKeys = features ? Object.keys(features.data || {}) : [];
    const hemisphereAvailability = getHemisphereAvailability(featureKeys, idxSplit);

    if (!hemisphereAvailability) {
        return null;
    }

    const { vmin, vmax } = resolveFeatureRange(features, stat, histogram);
    const regionColors = {};

    for (const regionIdx in regions) {
        const region = regions[regionIdx];
        const isLeft = region.name.includes('left');
        const dataInHemisphere = (isLeft && hemisphereAvailability.hasLeft) || (!isLeft && hemisphereAvailability.hasRight);

        let value = features?.data?.[regionIdx] ?? null;
        if (!value) {
            if (dataInHemisphere) {
                regionColors[regionIdx] = MISSING_REGION_COLOR;
            }
            continue;
        }

        value = value[stat];
        if (!value) {
            regionColors[regionIdx] = NULL_VALUE_COLOR;
            continue;
        }

        const normalized = normalizeFeatureValue(value, vmin, vmax, cmin, cmax, logScale);
        regionColors[regionIdx] = colors[clamp(normalized, 0, 99)];
    }

    return regionColors;
}
