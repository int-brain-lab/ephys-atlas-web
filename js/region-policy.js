export function resolveCompatibleMappingForFeature({ isVolume, currentMapping, mappings }) {
    if (isVolume || !mappings || mappings.length === 0) {
        return null;
    }
    if (mappings.includes(currentMapping)) {
        return null;
    }
    return mappings[0];
}
