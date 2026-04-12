export { Dispatcher };

import { EVENTS } from "./core/events.js";

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
        this.emit(EVENTS.CONNECT, source);
    }

    data(source, name, key, data) {
        // when data has to be sent to the websocket server
        this.emit(EVENTS.DATA, source, { "name": name, "key": key, "data": data });
    }

    slice(source, axis, idx) {
        // when a slice changes
        this.emit(EVENTS.SLICE, source, { "axis": axis, "idx": idx });
    }

    highlight(source, idx, e) {
        // when a region is highlighted
        this.emit(EVENTS.HIGHLIGHT, source, { "idx": idx, "e": e });
    }

    volumeHover(source, axis, e) {
        this.emit(EVENTS.VOLUME_HOVER, source, { "axis": axis, "e": e });
    }

    volumeValues(source, axis, values, e) {
        this.emit(EVENTS.VOLUME_VALUES, source, { "axis": axis, "values": values, "e": e });
    }

    highlightDot(source, axis, sliceIdx, e) {
        // when a dot is highlighted (when pressing Control)
        this.emit(EVENTS.HIGHLIGHT_DOT, source, { "axis": axis, "sliceIdx": sliceIdx, "e": e });
    }

    toggle(source, idx) {
        // when a region is added or removed from the selection
        this.emit(EVENTS.TOGGLE, source, { "idx": idx });
    }

    toggleStatToolbox(source) {
        this.emit(EVENTS.TOGGLE_STAT_TOOLBOX, source, {});
    }

    clear(source,) {
        // when all regions are deselected
        this.emit(EVENTS.CLEAR, source, {});
    }

    reset(source,) {
        // when all regions are deselected
        this.emit(EVENTS.RESET, source, {});
    }

    bucket(source, uuid_or_alias) {
        // when a bucket is selected
        this.emit(EVENTS.BUCKET, source, { "uuid_or_alias": uuid_or_alias });
    }

    refresh(source, uuid_or_alias) {
        // when a bucket is refreshed
        this.emit(EVENTS.REFRESH, source, { "uuid_or_alias": uuid_or_alias });
    }

    bucketRemove(source, uuid_or_alias) {
        // when a bucket is removed
        this.emit(EVENTS.BUCKET_REMOVE, source, { "uuid_or_alias": uuid_or_alias });
    }

    search(source, text) {
        // when search text is changed
        this.emit(EVENTS.SEARCH, source, { "text": text });
    }

    spinning(source, isSpinning) {
        this.emit(EVENTS.SPINNING, source, { "isSpinning": isSpinning });
    }

    feature(source, fname, isVolume) {
        // when a feature is selected
        this.emit(EVENTS.FEATURE, source, { "fname": fname, "isVolume": isVolume });
    }

    featureHover(source, fname, desc, e) {
        // when the mouse hovers over a feature
        this.emit(EVENTS.FEATURE_HOVER, source, { "fname": fname, "desc": desc, "e": e });
    }

    featureRemove(source, uuid_or_alias, fname) {
        // when a local feature is removed
        this.emit(EVENTS.FEATURE_REMOVE, source, { "uuid_or_alias": uuid_or_alias, "fname": fname });
    }

    stat(source, name) {
        // when the stat is changed
        this.emit(EVENTS.STAT, source, { "name": name });
    }

    unityLoaded(source, instance) {
        this.emit(EVENTS.UNITY_LOADED, source, { "instance": instance });
    }

    cmap(source, name) {
        // when the colormap is changed
        this.emit(EVENTS.CMAP, source, { "name": name });
    }

    logScale(source, checked) {
        this.emit(EVENTS.LOG_SCALE, source, { "checked": checked });
    }

    panel(source, open) {
        this.emit(EVENTS.PANEL, source, { "open": open });
    }

    mapping(source, name) {
        // when the mapping is changed
        this.emit(EVENTS.MAPPING, source, { "name": name });
    }

    cmapRange(source, cmin, cmax) {
        // when the colormap range changes
        this.emit(EVENTS.CMAP_RANGE, source, { "cmin": cmin, "cmax": cmax });
    }

    share(source) {
        this.emit(EVENTS.SHARE, source);
    }

};
