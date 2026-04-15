/** @import { FeaturePayload, FeatureMappingData, FeatureHistogram } from './core/types.js' */

/**
 * @param {FeaturePayload | null | undefined} payload
 * @returns {string[] | null}
 */
export function getFeatureMappings(payload) {
    if (!payload?.mappings) {
        return null;
    }

    const mappings = [];
    for (const mapping in payload.mappings) {
        const ids = Object.keys(payload.mappings[mapping].data || {});
        ids.pop('1');
        if (ids.length > 0) {
            mappings.push(mapping);
        }
    }
    return mappings;
}

/**
 * @param {FeaturePayload | null | undefined} payload
 * @returns {string | null}
 */
export function getFeatureCmap(payload) {
    return payload?.cmap || null;
}

/**
 * @param {FeaturePayload | null | undefined} payload
 * @param {string} mapping
 * @returns {FeatureMappingData | null}
 */
export function getFeatureMappingData(payload, mapping) {
    if (!payload?.mappings) {
        return null;
    }

    return payload.mappings[mapping] || null;
}

/**
 * @param {FeaturePayload | null | undefined} payload
 * @returns {FeatureHistogram | null}
 */
export function getFeatureHistogram(payload) {
    return payload?.histogram || null;
}

/**
 * @param {FeaturePayload | null | undefined} payload
 * @returns {FeaturePayload | null}
 */
export function getFeatureVolumeData(payload) {
    if (!payload?.volumes) {
        return null;
    }

    return payload;
}
