import { decode, encode } from "../utils.js";

export function uniqueBuckets(buckets) {
    return buckets.filter((value, index, self) => self.indexOf(value) === index);
}

export function parseUrlState(search, { aliasStates, defaultBucket, defaultBuckets, debug = false }) {
    const query = new Proxy(new URLSearchParams(search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });

    let state = {};
    let buckets = [...defaultBuckets];

    if (query.alias) {
        const aliasState = aliasStates[query.alias];
        const decodedState = decode(aliasState.state);
        if (debug) {
            console.log("decoded state", decodedState);
        }
        state = decodedState;
        state.bucket = aliasState.bucket || defaultBucket;
        state.buckets = aliasState.buckets || defaultBuckets;
    }
    else if (query.state) {
        state = decode(query.state);
    }

    if (query.buckets) {
        buckets.push(...query.buckets.split(","));
    }

    state.buckets = uniqueBuckets(buckets);
    state.bucket = state.bucket || query.bucket;

    if (!defaultBuckets.includes(state.bucket) && !state.buckets.includes(state.bucket)) {
        state.bucket = null;
        state.fname = null;
        state.isVolume = null;
    }

    return state;
}

export function serializeStateToUrl(stateInput, { currentUrl, defaultBuckets }) {
    const state = { ...stateInput };
    let buckets = state.buckets || defaultBuckets;
    buckets = buckets.filter(item => !defaultBuckets.includes(item));
    delete state.buckets;

    const url = new URL(currentUrl);
    const params = url.searchParams;
    params.delete('alias');

    if (buckets.length > 0) {
        params.set('buckets', buckets.join(','));
    }
    else {
        params.delete('buckets');
    }

    params.set('bucket', state.bucket);
    delete state.bucket;
    params.set('state', encode(state));

    return url.toString();
}
