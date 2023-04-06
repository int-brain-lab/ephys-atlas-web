import { State } from "./state.js";
import { Slice } from "./slice.js";
import { Feature } from "./feature.js";
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
    constructor(db) {
        this.db = db;
        this.state = new State();

        this.init();
        this.setupResetButton();
    }

    init() {
        this.highlighter = new Highlighter(this.state);
        this.selector = new Selector(this.state);

        this.feature = new Feature(this.db, this.state);
        this.region = new Region(this.db, this.state, this.feature, this.highlighter, this.selector);
        this.tooltip = new Tooltip(this.state, this.region, this.feature);

        this.slice = new Slice(this.db, this.state, this.tooltip, this.highlighter, this.selector);

        this.unity = new Unity(this.db, this.state, this.region, this.feature);

        this.panel = new Panel(this.db, this.state, this.feature, this.region, this.selector, this.unity);

        this.maximizer = new Maximizer(this.state);
    }

    setupResetButton() {
        this.panel.ibreset.addEventListener('click', (e) => {
            if (window.confirm("Are you sure you want to reset the view?")) {
                this.state.init({});
                this.init();
                this.selector.clear();

                // Reset the browser URL.
                const url = new URL(window.location);
                url.searchParams.set('state', '');
                window.history.pushState(null, '', url.toString());
            }
        });
    }
};
