export { Volume };

import { clearStyle } from "./utils.js";
import { getRequiredElement, getRequiredSheet } from "./core/dom.js";
import { VOLUME_AXES, VOLUME_XY_AXES } from "./constants.js";
import {
    denormalizeVolumeValue,
    getVolumeHoverAxisCoords,
    hexColorToRgb,
    indexFromAxisCoords,
} from "./core/volume-helpers.js";
import { buildVolumeVisibilityRules, getVolumeSliderMax, getVolumeSliceIndex } from "./core/volume-ui-helpers.js";
import { EVENTS } from "./core/events.js";
import { VolumeSession } from "./volume-session.js";
import { VolumeCanvasRenderer } from "./volume-canvas-renderer.js";

class Volume {
    constructor(state, model, dispatcher) {
        console.assert(state);
        console.assert(dispatcher);

        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.session = new VolumeSession();
        this.volumeContainers = {};
        this.svgs = {};
        this.canvases = {};
        this.baseViewBox = {};
        this.baseViewBoxSize = {};
        for (const axis of VOLUME_AXES) {
            this.volumeContainers[axis] = getRequiredElement(`svg-${axis}-container-inner`);
            this.canvases[axis] = getRequiredElement(`canvas-${axis}`);
            const svg = getRequiredElement(`svg-${axis}`);
            this.svgs[axis] = svg;
            const vb = svg.getAttribute("viewBox");
            this.baseViewBox[axis] = vb;
            if (vb) {
                const parts = vb.split(/\s+/).map(Number);
                if (parts.length === 4 && parts.every(isFinite)) {
                    const [, , w, h] = parts;
                    this.baseViewBoxSize[axis] = { w, h };
                }
            }
        }
        this.session.volumeArrays = {};
        this.activeVolumeName = null;

        this.renderer = new VolumeCanvasRenderer({
            canvases: this.canvases,
            svgs: this.svgs,
            containers: this.volumeContainers,
            baseViewBox: this.baseViewBox,
            baseViewBoxSize: this.baseViewBoxSize,
        });

        this.style = getRequiredSheet('style-volume');

        this.setupDispatcher();
    }

    showVolume() {
        clearStyle(this.style);
        for (const rule of buildVolumeVisibilityRules(true)) {
            this.style.insertRule(rule);
        }
    }

    hideVolume() {
        clearStyle(this.style);
        for (const rule of buildVolumeVisibilityRules(false)) {
            this.style.insertRule(rule);
        }
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.FEATURE, async (ev) => {
            if (!ev.isVolume) {
                this.hideVolume();
                this.session.reset();
            }
            else {
                this.showVolume();

                const state = this.state;
                const volume = this.model.getVolumeData(state.bucket, state.fname);

                if (!volume || !volume["volumes"]) {
                    this.setSessionArray(null);
                    return;
                }

                this.session.loadVolumeEntries(volume);

                const preferred = this.session.getPreferredVolumeName();
                if (preferred) {
                    this.session.activeVolumeName = preferred;
                    this.setSessionArray(this.session.volumeArrays[preferred], preferred);
                }
                else {
                    this.setSessionArray(null);
                }

                this.draw();
            }
        });

        this.dispatcher.on(EVENTS.VOLUME_HOVER, async (ev) => {
            if (this.state.isVolume) {
                this.handleVolumeHover(ev.axis, ev.e);
            }
        });

        this.dispatcher.on(EVENTS.SLICE, async (ev) => {
            this.drawSlice(ev.axis, ev.idx);
        });

        this.dispatcher.on(EVENTS.CMAP, async () => {
            if (this.state.isVolume) {
                this.setCmap();
                this.draw();
            }
        });
        this.dispatcher.on(EVENTS.CMAP_RANGE, async () => {
            if (this.state.isVolume) {
                this.draw();
            }
        });
    }

    setCmap() {
        const colors = this.model.getColormap(this.state.cmap);
        this.colors = [];
        for (let i = 0; i < colors.length; i++) {
            this.colors[i] = hexColorToRgb(colors[i]);
        }
    }

    indexFromAxisCoords(axisCoords) {
        return indexFromAxisCoords(axisCoords, this.session.rawToAxis, this.session.shape, this.session.fortran_order, VOLUME_AXES);
    }

    updateSliceRanges() {
        if (!this.session.axisSizes) {
            return;
        }
        for (const axis of VOLUME_AXES) {
            const slider = getRequiredElement(`slider-${axis}`);
            if (!slider) continue;
            const voxels = this.session.axisSizes[axis];
            const ds = this.session.downsample ? (this.session.downsample[axis] || 1) : 1;
            const max = getVolumeSliderMax(voxels, ds);
            slider.max = max;
            const value = parseInt(slider.value);
            if (value > max) {
                slider.value = max;
            }
        }
    }

    drawSlice(axis, idx) {
        this.renderer.drawSlice(axis, idx, {
            state: this.state,
            session: this.session,
            colors: this.colors,
        });
    }

    setSessionArray(arr, volumeName = null) {
        const mapping = this.session.setArray(arr, volumeName);
        if (!mapping) {
            return;
        }

        this.renderer.updateCanvasSizes(this.session);
        this.updateSliceRanges();
        this.setCmap();
    }

    sliceIndexFromState(axis) {
        if (!this.session.axisSizes || !this.session.axisSizes[axis]) {
            return 0;
        }
        const ds = this.session.downsample ? (this.session.downsample[axis] || 1) : 1;
        const sliceCount = this.session.axisSizes[axis];
        const sliderValue = this.state[axis] || 0;
        return getVolumeSliceIndex(sliderValue, ds, sliceCount);
    }

    handleVolumeHover(axis, e) {
        if (!this.state.isVolume || !axis || !e || !this.session.axisSizes) {
            return;
        }

        if (!this.session.volumeArrays || Object.keys(this.session.volumeArrays).length === 0) {
            return;
        }

        const container = this.volumeContainers[axis];
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const axisCoords = getVolumeHoverAxisCoords(
            axis,
            rect,
            e,
            this.session.axisSizes,
            VOLUME_XY_AXES,
            this.sliceIndexFromState(axis),
            VOLUME_AXES,
        );
        if (!axisCoords) {
            return;
        }

        const dataIndex = this.indexFromAxisCoords(axisCoords);
        if (dataIndex == null || dataIndex < 0) {
            return;
        }

        const values = {};
        for (const [name, arr] of Object.entries(this.session.volumeArrays)) {
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
            return;
        }

        this.dispatcher.volumeValues(this, axis, values, e);
    }

    draw() {
        this.renderer.draw(this.state, this.session, this.colors);
    }
};
