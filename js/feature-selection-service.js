export async function loadAndSelectFeature({ state, model, dispatcher, source, dropdown, fname, isVolume = undefined, options }) {
    if (!fname) {
        applyFeatureSelection({ state, model, dispatcher, source, dropdown, fname: '', isVolume: undefined });
        return { fname: '', isVolume: undefined };
    }

    await model.downloadFeatures(state.bucket, fname, options);

    const resolvedIsVolume = isVolume !== undefined ? isVolume : model.getFeatureVolumeData(state.bucket, fname, state.mapping) != undefined;
    applyFeatureSelection({ state, model, dispatcher, source, dropdown, fname, isVolume: resolvedIsVolume });
    return { fname, isVolume: resolvedIsVolume };
}

export function applyFeatureSelection({ state, model, dispatcher, source, dropdown, fname, isVolume }) {
    console.log(`select feature ${fname}, volume=${isVolume}`);
    state.setFeature(fname, isVolume);
    dropdown.select(fname);

    if (fname) {
        model.scheduleFeaturePrefetch(state.bucket, fname);
    }
    else {
        model.clearFeaturePrefetch();
    }

    dispatcher.feature(source, fname, isVolume);
}
