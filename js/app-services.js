import { Dispatcher } from "./dispatcher.js";
import { Model } from "./model.js";
import { Splash } from "./splash.js";
import { State } from "./state.js";

const SPLASH_MESSAGE = "Please wait, the website is downloading tens of MB of data.";

export function createAppServices() {
    const splash = new Splash(SPLASH_MESSAGE);
    const state = new State();
    const model = new Model(splash);
    const dispatcher = new Dispatcher();

    return {
        splash,
        state,
        model,
        dispatcher,
    };
}
