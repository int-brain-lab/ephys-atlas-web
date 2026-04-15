import { parseUrlState, serializeStateToUrl } from "./core/state-url.js";
import { ALIAS_STATES, DEFAULT_BUCKET, DEFAULT_BUCKETS } from "./state-defaults.js";

export function loadStateFromUrl({ search = window.location.search, debug = false } = {}) {
    return parseUrlState(search, {
        aliasStates: ALIAS_STATES,
        defaultBucket: DEFAULT_BUCKET,
        defaultBuckets: DEFAULT_BUCKETS,
        debug,
    });
}

export function serializeAppStateToUrl(state, { currentUrl = window.location.toString() } = {}) {
    const serializableState = { ...state };
    delete serializableState._toggle;
    serializableState.selected = Array.from(serializableState.selected || []);

    return serializeStateToUrl(serializableState, {
        currentUrl,
        defaultBuckets: DEFAULT_BUCKETS,
    });
}

export function replaceBrowserUrl(url, historyApi = window.history) {
    historyApi.replaceState(null, '', url.toString());
    return url;
}
