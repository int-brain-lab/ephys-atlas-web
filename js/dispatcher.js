export { Dispatcher };

// import { downloadJSON } from "./utils.js";



/*************************************************************************************************/
/* Dispatcher                                                                                    */
/*************************************************************************************************/

class Dispatcher {
    constructor() {
        this.el = document.getElementById('dispatcher');
    }

    emit(name, source, data) {
        const ev = new CustomEvent(name, {
            detail: {
                source: source,
                data: data,
            },
        });
        this.el.dispatchEvent(ev);
    }

    on(name, callback) {
        this.el.addEventListener(name, (ev) => { return callback(ev.detail.data); });
    }

    slice(source, axis, idx) {
        // when a slice changes
        this.emit("slice", source, { "axis": axis, "idx": idx });
    }

    highlight(source, idx, e) {
        // when a region is highlighted
        this.emit("highlight", source, { "idx": idx, "e": e });
    }

    toggle(source, idx) {
        // when a region is added or removed from the selection
        this.emit("toggle", source, { "idx": idx });
    }

    clear(source,) {
        // when all regions are deselected
        this.emit("clear", source, {});
    }

    reset(source,) {
        // when all regions are deselected
        this.emit("reset", source, {});
    }

    bucket(source, uuid_or_alias) {
        // when a bucket is selected
        this.emit("bucket", source, { "uuid_or_alias": uuid_or_alias });

    }

    search(source, text) {
        // when search text is changed
        this.emit("search", source, { "text": text });
    }

    feature(source, fname) {
        // when a feature is selected
        this.emit("feature", source, { "fname": fname });
    }

    featureHover(source, fname, desc, e) {
        // when the mouse hovers over a feature
        this.emit("featureHover", source, { "fname": fname, "desc": desc, "e": e });
    }

    stat(source, name) {
        // when the stat is changed
        this.emit("stat", source, { "name": name });
    }

    cmap(source, name) {
        // when the colormap is changed
        this.emit("cmap", source, { "name": name });
    }

    mapping(source, name) {
        // when the mapping is changed
        this.emit("mapping", source, { "name": name });
    }

    cmapRange(source, cmin, cmax) {
        // when the colormap range changes
        this.emit("cmapRange", source, { "cmin": cmin, "cmax": cmax });
    }


};


