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
        const payload = {
            name: name,
            detail: {
                source: source,
                data: data,
            },
        };
        const ev = new CustomEvent(name, payload);

        // console.debug(`emit ${name} event`);
        this.el.dispatchEvent(ev);
    }

    on(name, callback) {
        this.el.addEventListener(name, (ev) => { return callback(ev.detail.data, ev.detail.source); });
    }

    connect(source) {
        // Request a WebSocket connection.
        this.emit("connect", source);
    }

    data(source, name, key, data) {
        // when data has to be sent to the websocket server
        this.emit("data", source, { "name": name, "key": key, "data": data });
    }

    slice(source, axis, idx) {
        // when a slice changes
        this.emit("slice", source, { "axis": axis, "idx": idx });
    }

    highlight(source, idx, e) {
        // when a region is highlighted
        this.emit("highlight", source, { "idx": idx, "e": e });
    }

    highlightDot(source, axis, sliceIdx, e) {
        // when a dot is highlighted (when pressing Control)
        this.emit("highlightDot", source, { "axis": axis, "sliceIdx": sliceIdx, "e": e });
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

    refresh(source, uuid_or_alias) {
        // when a bucket is refreshed
        this.emit("refresh", source, { "uuid_or_alias": uuid_or_alias });
    }

    bucketRemove(source, uuid_or_alias) {
        // when a bucket is removed
        this.emit("bucketRemove", source, { "uuid_or_alias": uuid_or_alias });
    }

    search(source, text) {
        // when search text is changed
        this.emit("search", source, { "text": text });
    }

    spinning(source, isSpinning) {
        this.emit("spinning", source, { "isSpinning": isSpinning });
    }

    feature(source, fname, isVolume) {
        // when a feature is selected
        this.emit("feature", source, { "fname": fname, "isVolume": isVolume });
    }

    featureHover(source, fname, desc, e) {
        // when the mouse hovers over a feature
        this.emit("featureHover", source, { "fname": fname, "desc": desc, "e": e });
    }

    featureRemove(source, uuid_or_alias, fname) {
        // when a local feature is removed
        this.emit("featureRemove", source, { "uuid_or_alias": uuid_or_alias, "fname": fname });
    }

    stat(source, name) {
        // when the stat is changed
        this.emit("stat", source, { "name": name });
    }

    unityLoaded(source, instance) {
        this.emit("unityLoaded", source, { "instance": instance });
    }

    cmap(source, name) {
        // when the colormap is changed
        this.emit("cmap", source, { "name": name });
    }

    logScale(source, checked) {
        this.emit("logScale", source, { "checked": checked });
    }

    panel(source, open) {
        this.emit("panel", source, { "open": open });
    }

    mapping(source, name) {
        // when the mapping is changed
        this.emit("mapping", source, { "name": name });
    }

    cmapRange(source, cmin, cmax) {
        // when the colormap range changes
        this.emit("cmapRange", source, { "cmin": cmin, "cmax": cmax });
    }

    share(source) {
        this.emit("share", source);
    }

};
