import { State } from "./state.js";
import { Slice } from "./slice.js";
import { Feature } from "./feature.js";
import { Region } from "./region.js";
import { Highlighter, Selector, Tooltip } from "./interact.js";

export { App };



/*************************************************************************************************/
/* App                                                                                           */
/*************************************************************************************************/

class App {
    constructor(db) {
        this.db = db;
        this.state = new State();

        this.highlighter = new Highlighter(this.state);
        this.selector = new Selector(this.state);

        this.feature = new Feature(this.db, this.state);
        this.region = new Region(this.db, this.state, this.feature, this.highlighter, this.selector);
        this.tooltip = new Tooltip(this.state, this.region, this.feature);

        this.slice = new Slice(this.db, this.state, this.tooltip, this.highlighter, this.selector);

        // this.panel = new Panel(this.state);
    }
};
