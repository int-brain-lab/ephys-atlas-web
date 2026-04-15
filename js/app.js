import { ENABLE_UNITY } from "./constants.js";
import { createAppModules } from "./app-modules.js";
import { createAppServices } from "./app-services.js";

export { App };

class App {
    constructor() {
        const services = createAppServices();
        const modules = createAppModules(services);

        Object.assign(this, services, modules);
    }

    init() {
        this.splash.start();
        this.model.load().then(async () => {
            this.state.toggleUpdate(false);

            this.bucket.init();
            this.slice.init();
            this.feature.init();
            this.coloring.init();
            this.selector.init();
            this.panel.init();
            this.search.init();
            this.region.init().then(() => { this.selection.init(); });

            this.state.toggleUpdate(true);

            if (this.unity && ENABLE_UNITY)
                this.unity.init();
        });
    }
};
