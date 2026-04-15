function buildFallbackFeatureTree(features) {
    return Object.keys(features || {}).reduce((obj, key) => {
        obj[key] = key;
        return obj;
    }, {});
}

export function flattenFeatureTree(node) {
    if (!node) {
        return [];
    }

    const entries = [];
    for (const key in node) {
        if (!Object.prototype.hasOwnProperty.call(node, key)) {
            continue;
        }
        const value = node[key];
        if (value && typeof value === 'object') {
            entries.push(...flattenFeatureTree(value));
        }
        else if (value) {
            entries.push(value);
        }
    }
    return entries;
}

export function buildFeatureDropdownEntries(tree, features = {}) {
    const sourceTree = (!tree || tree.length == 0) ? buildFallbackFeatureTree(features) : tree;

    return flattenFeatureTreeEntries(sourceTree);
}

export function flattenFeatureTreeEntries(node, prefix = []) {
    if (!node) {
        return [];
    }

    const entries = [];
    for (const key in node) {
        if (!Object.prototype.hasOwnProperty.call(node, key)) {
            continue;
        }
        const value = node[key];
        if (value && typeof value === 'object') {
            entries.push(...flattenFeatureTreeEntries(value, prefix.concat(key)));
        }
        else {
            const labelParts = prefix.concat(key);
            entries.push({
                fname: value,
                label: labelParts.filter(Boolean).join(' / '),
            });
        }
    }
    return entries;
}
