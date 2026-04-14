export function getDefaultRegionColorsHref(mapping) {
    return `data/css/default_region_colors_${mapping}.css`;
}

export function buildRegionColorRules(mapping, regionColors) {
    const rules = [];

    for (const regionIdx in regionColors) {
        const hex = regionColors[regionIdx];
        rules.push(`svg path.${mapping}_region_${regionIdx} { fill: ${hex}; }\n`);
    }

    return rules;
}

export function buildRegionColoringView(mapping, fname, regionColors) {
    return {
        defaultHref: getDefaultRegionColorsHref(mapping),
        rules: buildRegionColorRules(mapping, regionColors),
        websocketKey: fname,
        websocketData: regionColors,
    };
}
