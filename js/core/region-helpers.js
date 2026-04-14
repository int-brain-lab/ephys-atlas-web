import { normalizeValue } from '../utils.js';

export const SEARCH_ACRONYM_STRING = "acronym=";

export function searchFilter(search, acronym, name) {
    search = (search || '').toLowerCase();
    acronym = (acronym || '').toLowerCase();
    name = (name || '').toLowerCase();

    if (!search) {
        return true;
    }

    if (search.includes(SEARCH_ACRONYM_STRING)) {
        return acronym === search.replace(SEARCH_ACRONYM_STRING, '');
    }

    return name.includes(search) || acronym.includes(search);
}

export function compareRegionItems(sortState, a, b) {
    if (sortState === 1) {
        return Number(b.value) - Number(a.value);
    }
    if (sortState === 2) {
        return Number(a.value) - Number(b.value);
    }
    return Number(a.idx) - Number(b.idx);
}

export function nextSortState(currentState) {
    return ((Number(currentState) || 0) + 1) % 3;
}

export function buildVisibleRegions(regions, features, stat, search) {
    const stats = features ? features.statistics : undefined;
    let vmin = 0;
    let vmax = 0;
    if (stats && stats[stat]) {
        vmin = stats[stat].min;
        vmax = stats[stat].max;
    }

    const keptRegions = {};
    for (const relIdx in regions) {
        const region = { ...regions[relIdx] };
        const regionIdx = region.idx;

        if (stats) {
            let value = features?.data?.[regionIdx];
            if (!value) {
                continue;
            }
            value = value[stat];
            region.normalized = normalizeValue(value, vmin, vmax);
        }

        if (search && !searchFilter(search, region.acronym, region.name)) {
            continue;
        }

        keptRegions[regionIdx] = region;
    }

    return keptRegions;
}

export function getRegionTitle(fname, stat) {
    return fname ? `${fname}: ${stat}` : '';
}
