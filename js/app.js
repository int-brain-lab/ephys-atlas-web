import { Bucket } from "./bucket.js";
import { Coloring } from "./coloring.js";
import { DB } from "./db.js";
import { Dispatcher } from "./dispatcher.js";
import { Feature } from "./feature.js";
import { Highlighter } from "./highlighter.js";
import { Region } from "./region.js";
import { Selection } from "./selection.js";
import { Selector } from "./selector.js";
import { Slice } from "./slice.js";
import { Splash } from "./splash.js";
import { State } from "./state.js";

// import { Maximizer } from "./maximizer.js";
// import { Panel } from "./panel.js";
// import { Tooltip } from "./tooltip.js";
// import { Unity } from "./unity.js";

export { App };



/*************************************************************************************************/
/* App                                                                                           */
/*************************************************************************************************/

class App {
    constructor() {
        this.splash = new Splash();

        // Common objects.
        this.state = new State();
        this.db = new DB(this.splash);
        this.dispatcher = new Dispatcher();

        // Components.
        this.bucket = new Bucket(this.state, this.db, this.dispatcher);
        this.slice = new Slice(this.state, this.db, this.dispatcher);
        this.feature = new Feature(this.state, this.db, this.dispatcher);
        this.region = new Region(this.state, this.db, this.dispatcher);
        this.highlighter = new Highlighter(this.state, this.db, this.dispatcher);
        this.coloring = new Coloring(this.state, this.db, this.dispatcher);
        this.selector = new Selector(this.state, this.db, this.dispatcher);
        this.selection = new Selection(this.state, this.db, this.dispatcher);

        // Create the components.
        // this.maximizer = new Maximizer(this.state);


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
            this.region.init();
            this.coloring.init();
            this.selector.init();

            // if (this.unity)
            //     this.unity.init();
            // this.panel.init();
        });
    }

};
