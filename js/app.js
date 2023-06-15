import { Bucket } from "./bucket.js";
import { DB } from "./db.js";
import { Dispatcher } from "./dispatcher.js";
import { Feature } from "./feature.js";
import { Slice } from "./slice.js";
import { Splash } from "./splash.js";
import { State } from "./state.js";

// import { Highlighter } from "./highlighter.js";
// import { Maximizer } from "./maximizer.js";
// import { Panel } from "./panel.js";
// import { Region } from "./region.js";
// import { Selector } from "./selector.js";
// import { Tooltip } from "./tooltip.js";
// import { Unity } from "./unity.js";

export { App };



/*************************************************************************************************/
/* App                                                                                           */
/*************************************************************************************************/

class App {
    constructor() {
        this.splash = new Splash();
        this.state = new State();

        this.db = new DB(this.splash);
        this.dispatcher = new Dispatcher();

        this.bucket = new Bucket(this.state, this.dispatcher);
        this.slice = new Slice(this.state, this.db, this.dispatcher);
        this.feature = new Feature(this.state, this.db, this.dispatcher);

        // Create the components.
        // this.highlighter = new Highlighter(this.state);
        // this.selector = new Selector(this.state);
        // this.maximizer = new Maximizer(this.state);


        // this.region = new Region(this.db, this.state, this.feature, this.highlighter, this.selector);
        // this.tooltip = new Tooltip(this.state, this.region, this.feature);
        // this.unity = new Unity(this.splash, this.db, this.state, this.region, this.feature);
        // this.panel = new Panel(this.db, this.state, this.feature, this.region, this.selector, this.unity);
    }

    init() {
        // Load the data.
        this.splash.start();
        this.db.load().then(async () => {
            this.bucket.init();
            this.slice.init();
            this.feature.init();

            // this.region.init();
            // if (this.unity)
            //     this.unity.init();
            // this.panel.init();
        });
    }

};
