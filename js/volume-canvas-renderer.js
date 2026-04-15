import { clamp } from "./utils.js";
import { VOLUME_AXES, VOLUME_XY_AXES } from "./constants.js";
import { getVolumePlaneSize, indexFromAxisCoords } from "./core/volume-helpers.js";
import { getVolumeSliceIndex } from "./core/volume-ui-helpers.js";

function makeImageData(canvas) {
    return canvas.getContext('2d').createImageData(canvas.width, canvas.height);
}

export class VolumeCanvasRenderer {
    constructor({ canvases, svgs, containers, baseViewBox, baseViewBoxSize }) {
        this.canvases = canvases;
        this.svgs = svgs;
        this.containers = containers;
        this.baseViewBox = baseViewBox;
        this.baseViewBoxSize = baseViewBoxSize;
        this.imageData = {};

        for (const axis of VOLUME_AXES) {
            const canvas = this.canvases[axis];
            if (canvas) {
                this.imageData[axis] = makeImageData(canvas);
            }
        }
    }

    updateCanvasSizes(session) {
        if (!session.axisSizes) {
            return;
        }
        for (const axis of VOLUME_AXES) {
            const canvas = this.canvases[axis];
            const plane = getVolumePlaneSize(axis, session.axisSizes, VOLUME_XY_AXES);
            if (!canvas || !plane) {
                continue;
            }

            const { width, height } = plane;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                this.imageData[axis] = makeImageData(canvas);
            }

            const svg = this.svgs[axis];
            if (svg) {
                const base = this.baseViewBox[axis];
                if (base) {
                    svg.setAttribute("viewBox", base);
                }
            }

            const container = this.containers[axis];
            if (container) {
                const vb = this.baseViewBoxSize[axis];
                const ratio = vb ? `${vb.w} / ${vb.h}` : `${width} / ${height}`;
                container.style.aspectRatio = ratio;
            }
        }
    }

    drawSlice(axis, idx, { state, session, colors }) {
        if (session.shape == null) {
            return;
        }

        let cmin = state.cmapmin * 2.55;
        let cmax = state.cmapmax * 2.55;
        if (cmin >= cmax) {
            return;
        }

        const nTotal = colors.length;
        const canvas = this.canvases[axis];
        let imageData = this.imageData[axis];
        let data = imageData.data;
        console.assert(canvas);

        const plane = getVolumePlaneSize(axis, session.axisSizes, VOLUME_XY_AXES);
        if (!plane) {
            return;
        }
        const { widthAxis, heightAxis, width, height, sliceCount } = plane;

        if (canvas.width !== width || canvas.height !== height || !imageData || imageData.width !== width || imageData.height !== height) {
            canvas.width = width;
            canvas.height = height;
            imageData = this.imageData[axis] = makeImageData(canvas);
            data = imageData.data;
        }

        const ds = session.downsample ? (session.downsample[axis] || 1) : 1;
        const sliceIdx = getVolumeSliceIndex(idx, ds, sliceCount);

        let i = 0;
        const axisCoords = [0, 0, 0];
        axisCoords[VOLUME_AXES.indexOf(axis)] = sliceIdx;
        const widthIdx = VOLUME_AXES.indexOf(widthAxis);
        const heightIdx = VOLUME_AXES.indexOf(heightAxis);

        for (let h = 0; h < height; h++) {
            axisCoords[heightIdx] = h;
            for (let w = 0; w < width; w++) {
                axisCoords[widthIdx] = w;
                const j = indexFromAxisCoords(axisCoords, session.rawToAxis, session.shape, session.fortran_order, VOLUME_AXES);
                let value = session.volume[j];

                value = (value - cmin) / (cmax - cmin);
                value = clamp(value, 0, .9999);
                const rgb = colors[Math.floor(value * nTotal)];
                if (rgb != undefined) {
                    data[i + 0] = rgb[0];
                    data[i + 1] = rgb[1];
                    data[i + 2] = rgb[2];
                }
                data[i + 3] = 255;
                i = i + 4;
            }
        }

        canvas.getContext('2d').putImageData(imageData, 0, 0);
    }

    draw(state, session, colors) {
        console.log("redraw volume bitmaps");

        if (state.logScale) {
            console.warn("pseudo log scale not yet implemented on volumes");
        }

        this.drawSlice('coronal', state.coronal, { state, session, colors });
        this.drawSlice('horizontal', state.horizontal, { state, session, colors });
        this.drawSlice('sagittal', state.sagittal, { state, session, colors });
    }
}
