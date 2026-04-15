export function buildPrefetchList(orderedFeatures, fname) {
    if (!orderedFeatures.length) {
        return [];
    }

    const currentIndex = orderedFeatures.indexOf(fname);
    if (currentIndex < 0) {
        return orderedFeatures.filter((candidate) => candidate !== fname);
    }

    const prefetch = [];
    for (let distance = 1; distance < orderedFeatures.length; distance++) {
        const nextIndex = currentIndex + distance;
        if (nextIndex < orderedFeatures.length) {
            prefetch.push(orderedFeatures[nextIndex]);
        }

        const prevIndex = currentIndex - distance;
        if (prevIndex >= 0) {
            prefetch.push(orderedFeatures[prevIndex]);
        }
    }
    return prefetch;
}

export function buildFeaturePrefetchPlan({
    bucket,
    fname,
    orderedFeatures,
    volumeFeatures,
    hasFeature,
    hasRawVolumeResponse,
}) {
    if (!bucket || !fname) {
        return { rawVolumeTasks: [], tasks: [] };
    }

    const selectedIsVolume = volumeFeatures.has(fname);
    const rawVolumeTasks = orderedFeatures
        .filter((candidate) =>
            candidate &&
            candidate !== fname &&
            volumeFeatures.has(candidate) &&
            !hasFeature(candidate) &&
            !hasRawVolumeResponse(candidate))
        .map((candidate) => ({ bucket, fname: candidate }));

    const candidates = buildPrefetchList(orderedFeatures, fname)
        .filter((candidate) => {
            if (!candidate || candidate === fname || hasFeature(candidate)) {
                return false;
            }

            const candidateIsVolume = volumeFeatures.has(candidate);
            if (selectedIsVolume) {
                return candidateIsVolume;
            }

            return !candidateIsVolume;
        });

    const limitedCandidates = selectedIsVolume ? candidates.slice(0, 2) : candidates;
    const tasks = limitedCandidates.map((candidate) => ({ bucket, fname: candidate }));

    return { rawVolumeTasks, tasks };
}
