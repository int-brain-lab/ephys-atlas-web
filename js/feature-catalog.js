import { flattenFeatureTree } from "./core/feature-tree.js";

export { flattenFeatureTree };

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
