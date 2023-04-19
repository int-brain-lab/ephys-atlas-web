import { State } from "./state.js";
import { Splash } from "./splash.js";
import { Slice } from "./slice.js";
import { Feature } from "./feature.js";
import { DB } from "./db.js";
import { CustomFeature } from "./custom_feature.js";
import { Region } from "./region.js";
import { Highlighter, Selector, Tooltip } from "./interact.js";
import { Panel } from "./panel.js";
import { Maximizer } from "./maximizer.js";
import { Unity } from "./unity.js";

export { App };



/*************************************************************************************************/
/* App                                                                                           */
/*************************************************************************************************/

class App {
    constructor() {
        // Create the State.
        this.state = new State();

        // Create the Splash.
        this.splash = new Splash();

        // Create the components.
        this.highlighter = new Highlighter(this.state);
        this.selector = new Selector(this.state);
        this.maximizer = new Maximizer(this.state);

        this.db = new DB(this.splash);

        this.feature = new Feature(this.db, this.state);
        this.region = new Region(this.db, this.state, this.feature, this.highlighter, this.selector);
        this.tooltip = new Tooltip(this.state, this.region, this.feature);
        this.unity = new Unity(this.splash, this.db, this.state, this.region, this.feature);
        this.slice = new Slice(this.db, this.state, this.region, this.tooltip, this.highlighter, this.selector);
        this.panel = new Panel(this.db, this.state, this.feature, this.region, this.selector, this.unity);
        // TODO
        // this.custom_feature = new CustomFeature(this.db);
    }

    init() {
        // Load the data.
        this.splash.start();
        this.db.load().then(() => {
            this.feature.init();
            this.region.init();
            if (this.unity)
                this.unity.init();
            this.slice.init();
            this.panel.init();
        });
    }

};
