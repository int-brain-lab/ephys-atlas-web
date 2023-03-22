import { State } from "./state.js";
import { Slice } from "./slice.js";
import { Feature } from "./feature.js";
import { Region } from "./region.js";

export { App };



/*************************************************************************************************/
/* App                                                                                           */
/*************************************************************************************************/

class App {
    constructor(db) {
        this.db = db;
        this.state = new State();

        // this.highlighter = new Highlighter();
        // this.selector = new Selector();
        this.slice = new Slice(this.db, this.state);//, this.info, this.highlighter, this.selector);

        this.feature = new Feature(this.db, this.state);
        this.region = new Region(this.db, this.state, this.feature); //, this.highlighter, this.selector);



        // this.info = new Info(this.db, this.state);
        // this.panel = new Panel(this.state);
    }
};
