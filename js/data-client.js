export { DataClient };

import { downloadJSON, downloadText } from "./utils.js";

class DataClient {
    constructor({ urls }) {
        this.urls = urls;
    }

    fetchBucket(bucket, options) {
        const refresh = options ? options.refresh : false;
        return downloadJSON(this.urls.bucket(bucket), refresh);
    }

    fetchFeature(bucket, fname, options) {
        const refresh = options ? options.refresh : false;
        const signal = options ? options.signal : undefined;
        return downloadJSON(this.urls.features(bucket, fname), refresh, { signal });
    }

    fetchFeatureText(bucket, fname, options) {
        const refresh = options ? options.refresh : false;
        const signal = options ? options.signal : undefined;
        return downloadText(this.urls.features(bucket, fname), refresh, { signal });
    }
}
