export const BIN_COUNT = 50;

export function computeHistogram(binCount, vmin, vmax, values) {
    const histogram = new Array(binCount).fill(0);
    const binWidth = (vmax - vmin) / binCount;

    values.forEach((value) => {
        if (value < vmin || value >= vmax) {
            return;
        }
        const binIndex = Math.floor((value - vmin) / binWidth);
        histogram[binIndex]++;
    });

    return histogram;
}

export function getFeatureHistogram(features, selected, binCount = BIN_COUNT) {
    if (!selected) return null;

    const histogram = new Array(binCount).fill(0);
    let selectedCount = 0;

    selected.forEach((regionIdx) => {
        const feature = features?.data?.[regionIdx];
        if (!feature) return;
        selectedCount += feature.count || 0;

        Object.keys(feature).forEach((key) => {
            const match = key.match(/^h_(\d+)$/);
            if (!match) return;
            const index = parseInt(match[1], 10);
            if (index >= 0 && index < binCount) {
                histogram[index] += feature[key];
            }
        });
    });

    return [histogram, selectedCount];
}
