import { Bucket } from "./bucket.js";
import { Colorbar } from "./colorbar.js";
import { Coloring } from "./coloring.js";
import { Model } from "./model.js";
import { Dispatcher } from "./dispatcher.js";
import { Feature } from "./feature.js";
import { Highlighter } from "./highlighter.js";
import { Maximizer } from "./maximizer.js";
import { Panel } from "./panel.js";
import { Region } from "./region.js";
import { Search } from "./search.js";
import { Selection } from "./selection.js";
import { Selector } from "./selector.js";
import { Share } from "./share.js";
import { Slice } from "./slice.js";
import { Splash } from "./splash.js";
import { State } from "./state.js";
import { Tooltip } from "./tooltip.js";

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
        this.model = new Model(this.splash);
        this.dispatcher = new Dispatcher();

        // Components.
        this.bucket = new Bucket(this.state, this.model, this.dispatcher);
        this.colorbar = new Colorbar(this.state, this.model, this.dispatcher);
        this.coloring = new Coloring(this.state, this.model, this.dispatcher);
        this.feature = new Feature(this.state, this.model, this.dispatcher);
        this.highlighter = new Highlighter(this.state, this.model, this.dispatcher);
        this.maximizer = new Maximizer(this.state, this.model, this.dispatcher);
        this.panel = new Panel(this.state, this.model, this.dispatcher);
        this.region = new Region(this.state, this.model, this.dispatcher);
        this.search = new Search(this.state, this.model, this.dispatcher);
        this.selection = new Selection(this.state, this.model, this.dispatcher);
        this.selector = new Selector(this.state, this.model, this.dispatcher);
        this.share = new Share(this.state, this.model, this.dispatcher);
        this.slice = new Slice(this.state, this.model, this.dispatcher);
        this.tooltip = new Tooltip(this.state, this.model, this.dispatcher);

        // this.unity = new Unity(this.splash, this.model, this.state, this.region, this.feature);
    }

    init() {
        // Load the data.
        this.splash.start();
        this.model.load().then(async () => {
            // Prevent URL update when loading the app.
            this.state.toggleUpdate(false);

            this.bucket.init();
            this.slice.init();
            this.feature.init();
            this.coloring.init();
            this.selector.init();
            this.panel.init();
            this.region.init().then(() => { this.selection.init(); });

            this.state.toggleUpdate(true);

            // if (this.unity)
            //     this.unity.init();
        });
    }

};
