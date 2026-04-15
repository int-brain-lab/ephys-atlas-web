import { initializeApp } from "./app-lifecycle.js";
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
        return initializeApp(this);
    }
};
