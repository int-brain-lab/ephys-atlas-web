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

export function getOrderedBucketFeatures(bucket) {
    if (!bucket?.features) {
        return [];
    }

    const fromTree = flattenFeatureTree(bucket.metadata?.tree);
    if (fromTree.length > 0) {
        return fromTree.filter((fname, index, arr) => fname && arr.indexOf(fname) === index);
    }

    return Object.keys(bucket.features);
}

export function getVolumeFeatureSet(bucket) {
    return new Set(bucket?.metadata?.volumes || []);
}
