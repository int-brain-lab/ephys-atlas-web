import { SLICE_DEFAULT } from "../constants.js";
import {
    DEFAULT_BUCKET,
    DEFAULT_BUCKETS,
    DEFAULT_COLORMAP,
    DEFAULT_COLORMAP_MAX,
    DEFAULT_COLORMAP_MIN,
    DEFAULT_EXPLODED,
    DEFAULT_HIGHLIGHTED,
    DEFAULT_LOG_SCALE,
    DEFAULT_MAPPING,
    DEFAULT_STAT,
} from "../state-defaults.js";

/** @import { AppStateShape } from "./types.js" */

/**
 * Normalize a partial app-state object into the in-memory state shape used by `State`.
 *
 * This keeps the current coercion semantics intact so the refactor is structural only.
 *
 * @param {Partial<AppStateShape> & Record<string, unknown>} state
 * @returns {AppStateShape}
 */
export function normalizeAppState(state) {
    return /** @type {AppStateShape} */ ({
        cmap: state.cmap || DEFAULT_COLORMAP,
        cmapmin: state.cmapmin || DEFAULT_COLORMAP_MIN,
        cmapmax: state.cmapmax || DEFAULT_COLORMAP_MAX,
        logScale: state.logScale || DEFAULT_LOG_SCALE,

        bucket: state.bucket || DEFAULT_BUCKET,
        buckets: state.buckets || DEFAULT_BUCKETS,
        fname: state.fname,
        isVolume: state.isVolume,
        stat: state.stat || DEFAULT_STAT,

        coronal: parseInt(String(state.coronal)) || SLICE_DEFAULT.coronal,
        sagittal: parseInt(String(state.sagittal)) || SLICE_DEFAULT.sagittal,
        horizontal: parseInt(String(state.horizontal)) || SLICE_DEFAULT.horizontal,

        exploded: parseFloat(String(state.exploded)) || DEFAULT_EXPLODED,
        mapping: state.mapping || DEFAULT_MAPPING,
        highlighted: state.highlighted || DEFAULT_HIGHLIGHTED,
        selected: new Set(state.selected || []),
        panelOpen: state.panelOpen,
    });
}
