import { BIN_COUNT, computeHistogram } from './histogram-helpers.js';

export function collectRegionStatValues(regions, features, stat) {
    const values = [];
    let vmin = Number.POSITIVE_INFINITY;
    let vmax = Number.NEGATIVE_INFINITY;

    for (const regionIdx in regions || {}) {
        const feature = features?.data?.[regionIdx];
        if (!feature) {
            continue;
        }
        const value = feature[stat];
        if (value == null) {
            continue;
        }
        values.push(value);
        vmin = Math.min(vmin, value);
        vmax = Math.max(vmax, value);
    }

    return {
        values,
        vmin,
        vmax,
    };
}

export function resolveColorbarRange(histogram, volume) {
    if (histogram) {
        return {
            vmin: histogram.vmin,
            vmax: histogram.vmax,
            totalCount: histogram.total_count,
        };
    }

    const bounds = volume?.volumes?.mean?.volume?.bounds;
    if (bounds && bounds.length >= 2) {
        return {
            vmin: bounds[0],
            vmax: bounds[1],
            totalCount: null,
        };
    }

    return null;
}

export function resolveGlobalHistogramCounts(histogram, isVolume, regions, features, stat, binCount = BIN_COUNT) {
    if (histogram?.counts?.length) {
        return histogram.counts;
    }

    if (isVolume) {
        return null;
    }

    const { values, vmin, vmax } = collectRegionStatValues(regions, features, stat);
    if (!values.length || !isFinite(vmin) || !isFinite(vmax) || vmin === vmax) {
        return null;
    }

    return computeHistogram(binCount, vmin, vmax, values);
}
