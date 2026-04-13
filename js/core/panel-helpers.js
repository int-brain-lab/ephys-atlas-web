export function toHistogramValueRange(cmin, cmax, histogram) {
    if (!histogram) {
        return [0, 0];
    }

    const vmin = histogram.vmin;
    const vmax = histogram.vmax;
    const vdiff = vmax - vmin;
    const vminMod = vmin + vdiff * cmin / 100.0;
    const vmaxMod = vmin + vdiff * cmax / 100.0;
    return [vminMod, vmaxMod];
}

export function fromHistogramValueRange(vminMod, vmaxMod, histogram) {
    if (!histogram) {
        return [0, 0];
    }

    const vmin = histogram.vmin;
    const vmax = histogram.vmax;
    const vdiff = vmax - vmin;
    const cmin = (vminMod - vmin) * 100.0 / vdiff;
    const cmax = (vmaxMod - vmin) * 100.0 / vdiff;
    return [cmin, cmax];
}
