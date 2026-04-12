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
