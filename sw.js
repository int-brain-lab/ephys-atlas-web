// ChatGPT code

// // Define a cache name for your assets
// const cacheName = 'assetsCache';

// // Fetch event: handle requests with cache-first, network-second strategy
// self.addEventListener('fetch', (event) => {
//     event.respondWith(
//         caches.match(event.request)
//             .then((response) => response || fetch(event.request))
//     );
// });





// code from https://developer.mozilla.org/en-US/docs/Web/API/Cache

console.info("loading SW");
const CACHE_VERSION = 1;
const CURRENT_CACHES = {
    website: `IBLAtlasCache-v${CACHE_VERSION}`,
};
const CACHE_NAME = CURRENT_CACHES['website'];

// Define an array of URLs to cache
const CACHE_URLS = [
    // '/',
    // '/index.html',
    // '/css/main.css',

    '/api/buckets/ephys',
    '/api/buckets/bwm',

    '/api/buckets/ephys/psd_alpha',
    '/api/buckets/ephys/psd_beta',
    '/api/buckets/ephys/psd_delta',
    '/api/buckets/ephys/psd_gamma',
    '/api/buckets/ephys/psd_theta',
    '/api/buckets/ephys/rms_ap',
    '/api/buckets/ephys/rms_lf',
    '/api/buckets/ephys/spike_rate',
    '/api/buckets/bwm/block_decoding_effect',
    '/api/buckets/bwm/block_decoding_frac_significant',
    '/api/buckets/bwm/block_decoding_significant',
    '/api/buckets/bwm/block_euclidean_effect',
    '/api/buckets/bwm/block_euclidean_latency',
    '/api/buckets/bwm/block_euclidean_significant',
    '/api/buckets/bwm/block_glm_effect',
    '/api/buckets/bwm/block_mannwhitney_effect',
    '/api/buckets/bwm/block_mannwhitney_significant',
    '/api/buckets/bwm/choice_decoding_effect',
    '/api/buckets/bwm/choice_decoding_frac_significant',
    '/api/buckets/bwm/choice_decoding_significant',
    '/api/buckets/bwm/choice_euclidean_effect',
    '/api/buckets/bwm/choice_euclidean_latency',
    '/api/buckets/bwm/choice_euclidean_significant',
    '/api/buckets/bwm/choice_glm_effect',
    '/api/buckets/bwm/choice_mannwhitney_effect',
    '/api/buckets/bwm/choice_mannwhitney_significant',
    '/api/buckets/bwm/feedback_decoding_effect',
    '/api/buckets/bwm/feedback_decoding_frac_significant',
    '/api/buckets/bwm/feedback_decoding_significant',
    '/api/buckets/bwm/feedback_euclidean_effect',
    '/api/buckets/bwm/feedback_euclidean_latency',
    '/api/buckets/bwm/feedback_euclidean_significant',
    '/api/buckets/bwm/feedback_glm_effect',
    '/api/buckets/bwm/feedback_mannwhitney_effect',
    '/api/buckets/bwm/feedback_mannwhitney_significant',
    '/api/buckets/bwm/stimulus_decoding_effect',
    '/api/buckets/bwm/stimulus_decoding_frac_significant',
    '/api/buckets/bwm/stimulus_decoding_significant',
    '/api/buckets/bwm/stimulus_euclidean_effect',
    '/api/buckets/bwm/stimulus_euclidean_latency',
    '/api/buckets/bwm/stimulus_euclidean_significant',
    '/api/buckets/bwm/stimulus_glm_effect',
    '/api/buckets/bwm/stimulus_mannwhitney_effect',
    '/api/buckets/bwm/stimulus_mannwhitney_significant',

    '/css/normalize.min.css',
    '/css/wvm8pxc.css',
    '/images/ibl.png',

    '/data/css/default_region_colors_allen.css',
    '/data/css/default_region_colors_beryl.css',
    '/data/css/default_region_colors_cosmos.css',
    '/data/css/region_colors.css',

    '/data/json/colormaps.json',
    '/data/json/regions.json',
    '/data/json/slices_coronal.json',
    '/data/json/slices_horizontal.json',
    '/data/json/slices_sagittal.json',
    '/data/json/slices_swanson.json',
    '/data/json/slices_top.json',

    '/Build/webgl.data.gz',
    '/Build/webgl.framework.js.gz',
    '/Build/webgl.wasm.gz',
];


// Install event: cache the URLs on service worker installation
self.addEventListener('install', (event) => {
    console.debug("install the service worker");
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(CACHE_URLS))
            .then(() => self.skipWaiting())
            .catch((e) => console.error(e))
    );
});


self.addEventListener("activate", (event) => {
    console.info("*** activate the service worker");
    // Delete all caches that aren't named in CURRENT_CACHES.
    // While there is only one cache in this example, the same logic
    // will handle the case where there are multiple versioned caches.
    const expectedCacheNamesSet = new Set(Object.values(CURRENT_CACHES));
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cacheName) => {
                    if (!expectedCacheNamesSet.has(cacheName)) {
                        // If this cache name isn't present in the set of
                        // "expected" cache names, then delete it.
                        console.debug("Deleting out of date cache:", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            )
        )
    );
    return self.clients.claim();
});


self.addEventListener("fetch", (event) => {
    // console.debug("Handling fetch event for", event.request.url);

    event.respondWith(
        caches.open(CURRENT_CACHES.website).then((cache) => {
            return cache
                .match(event.request)
                .then((response) => {
                    if (response) {
                        // If there is an entry in the cache for event.request,
                        // then response will be defined and we can just return it.
                        console.debug(` loading ${event.request.url} from cache`);

                        return response;
                    }

                    // Otherwise, if there is no entry in the cache for event.request,
                    // response will be undefined, and we need to fetch() the resource.
                    // console.debug(
                    //     " No response for %s found in cache. About to fetch " +
                    //     "from network...", event.request.url
                    // );

                    // We call .clone() on the request since we might use it
                    // in a call to cache.put() later on.
                    // Both fetch() and cache.put() "consume" the request,
                    // so we need to make a copy.
                    // (see https://developer.mozilla.org/en-US/docs/Web/API/Request/clone)
                    return fetch(event.request.clone()).then((response) => {
                        // console.debug(
                        //     "  Response for %s from network is: %O",
                        //     event.request.url,
                        //     response
                        // );

                        if (
                            response.status < 400 &&
                            response.headers.has("content-type") &&
                            response.headers.get("content-type").match(/js|png|svg|html|css|gz|wasm\//i)
                        ) {
                            // This avoids caching responses that we know are errors
                            // (i.e. HTTP status code of 4xx or 5xx).
                            console.debug(`  caching the response to ${event.request.url}`);
                            // We call .clone() on the response to save a copy of it
                            // to the cache. By doing so, we get to keep the original
                            // response object which we will return back to the controlled
                            // page.
                            // https://developer.mozilla.org/en-US/docs/Web/API/Request/clone
                            cache.put(event.request, response.clone());
                        } else {
                            // console.debug("  Not caching the response to", event.request.url);
                        }

                        // Return the original response object, which will be used to
                        // fulfill the resource request.
                        return response;
                    });
                })
                .catch((error) => {
                    // This catch() will handle exceptions that arise from the match()
                    // or fetch() operations.
                    // Note that a HTTP error response (e.g. 404) will NOT trigger
                    // an exception.
                    // It will return a normal response object that has the appropriate
                    // error code set.
                    console.error("  error in fetch handler:", error);

                    throw error;
                });
        })
    );
});
