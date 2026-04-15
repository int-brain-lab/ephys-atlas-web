import { VOLUME_AXES, VOLUME_XY_AXES } from "./constants.js";
import {
    denormalizeVolumeValue,
    getVolumeHoverAxisCoords,
    indexFromAxisCoords,
} from "./core/volume-helpers.js";
import { getVolumeSliceIndex } from "./core/volume-ui-helpers.js";

export function getVolumeSliceIndexFromState(axis, state, session) {
    if (!session.axisSizes || !session.axisSizes[axis]) {
        return 0;
    }
    const ds = session.downsample ? (session.downsample[axis] || 1) : 1;
    const sliceCount = session.axisSizes[axis];
    const sliderValue = state[axis] || 0;
    return getVolumeSliceIndex(sliderValue, ds, sliceCount);
}

export function getVolumeHoverValues({ axis, event, state, session, container }) {
    if (!state.isVolume || !axis || !event || !session.axisSizes) {
        return null;
    }

    if (!session.volumeArrays || Object.keys(session.volumeArrays).length === 0) {
        return null;
    }

    if (!container) {
        return null;
    }

    const rect = container.getBoundingClientRect();
    const axisCoords = getVolumeHoverAxisCoords(
        axis,
        rect,
        event,
        session.axisSizes,
        VOLUME_XY_AXES,
        getVolumeSliceIndexFromState(axis, state, session),
        VOLUME_AXES,
    );
    if (!axisCoords) {
        return null;
    }

    const dataIndex = indexFromAxisCoords(axisCoords, session.rawToAxis, session.shape, session.fortran_order, VOLUME_AXES);
    if (dataIndex == null || dataIndex < 0) {
        return null;
    }

    const values = {};
    for (const [name, arr] of Object.entries(session.volumeArrays)) {
        if (!arr || !arr.data || dataIndex >= arr.data.length) {
            continue;
        }
        const rawValue = denormalizeVolumeValue(arr.data[dataIndex], arr.bounds);
        if (rawValue == null) {
            continue;
        }
        values[name] = rawValue;
    }

    if (Object.keys(values).length === 0) {
        return null;
    }

    return { values, dataIndex, axisCoords };
}
