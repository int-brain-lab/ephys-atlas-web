import { ENABLE_UNITY } from "./constants.js";

export async function initializeApp(app) {
    app.splash.start();
    await loadStaticData(app);
    suspendUrlUpdates(app);

    try {
        initPrimaryUi(app);
        await initDependentUi(app);
    } finally {
        resumeUrlUpdates(app);
    }

    initDeferredModules(app);
}

export async function loadStaticData(app) {
    await app.model.load();
}

export function suspendUrlUpdates(app) {
    app.state.toggleUpdate(false);
}

export function initPrimaryUi(app) {
    app.bucket.init();
    app.slice.init();
    app.feature.init();
    app.coloring.init();
    app.selector.init();
    app.panel.init();
    app.search.init();
}

export async function initDependentUi(app) {
    await app.region.init();
    app.selection.init();
}

export function resumeUrlUpdates(app) {
    app.state.toggleUpdate(true);
}

export function initDeferredModules(app) {
    if (app.unity && ENABLE_UNITY) {
        app.unity.init();
    }
}
