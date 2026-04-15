import { Bucket } from "./bucket.js";
import { Colorbar } from "./colorbar.js";
import { Coloring } from "./coloring.js";
import { DotImage } from "./dotimage.js";
import { Feature } from "./feature.js";
import { Highlighter } from "./highlighter.js";
import { LocalSocket } from "./socket.js";
import { Maximizer } from "./maximizer.js";
import { Panel } from "./panel.js";
import { Region } from "./region.js";
import { Search } from "./search.js";
import { Selection } from "./selection.js";
import { Selector } from "./selector.js";
import { Share } from "./share.js";
import { Slice } from "./slice.js";
import { Spinner } from "./spinner.js";
import { StatToolbox } from "./stattoolbox.js";
import { Tooltip } from "./tooltip.js";
import { Unity } from "./unity.js";
import { Volume } from "./volume.js";

export function createAppModules({ state, model, dispatcher }) {
    return {
        bucket: new Bucket(state, model, dispatcher),
        feature: new Feature(state, model, dispatcher),
        region: new Region(state, model, dispatcher),
        selection: new Selection(state, model, dispatcher),
        selector: new Selector(state, model, dispatcher),
        colorbar: new Colorbar(state, model, dispatcher),
        coloring: new Coloring(state, model, dispatcher),
        highlighter: new Highlighter(state, model, dispatcher),
        dotimage: new DotImage(state, model, dispatcher),
        maximizer: new Maximizer(state, model, dispatcher),
        panel: new Panel(state, model, dispatcher),
        search: new Search(state, model, dispatcher),
        share: new Share(state, model, dispatcher),
        slice: new Slice(state, model, dispatcher),
        spinner: new Spinner(state, model, dispatcher),
        localSocket: new LocalSocket(state, model, dispatcher),
        tooltip: new Tooltip(state, model, dispatcher),
        unity: new Unity(state, model, dispatcher),
        volume: new Volume(state, model, dispatcher),
        stattoolbox: new StatToolbox(state, model, dispatcher),
    };
}
