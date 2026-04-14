export { DotImage };

import { getRequiredElement } from "./core/dom.js";
import { EVENTS } from "./core/events.js";
import { getVolumeSize, VOLUME_XY_AXES, ij2xyz, xyz2ij } from "./constants.js";
import {
    findClosestPointIndex,
    getMouseVolumeCoords,
    getPointTriplet,
    projectVolumeCoordsToPixels,
} from "./core/dotimage-helpers.js";

function mouseXYZ(container, axis, sliceIdx, ev) {
    return getMouseVolumeCoords(
        axis,
        sliceIdx,
        ev,
        container.getBoundingClientRect(),
        getVolumeSize(),
        VOLUME_XY_AXES,
        ij2xyz,
    );
}

function xyz2px(container, axis, sliceIdx, xyz) {
    return projectVolumeCoordsToPixels(
        axis,
        xyz,
        { width: container.clientWidth, height: container.clientHeight },
        getVolumeSize(),
        (axisName, _sliceIdx, point) => xyz2ij(axisName, sliceIdx, point),
    );
}

function addDot(container, ij) {
    var dot = document.createElement("div");

    dot.style.position = "absolute";
    dot.style.left = (ij[0] / container.offsetWidth) * 100 + "%";
    dot.style.top = (ij[1] / container.offsetHeight) * 100 + "%";
    dot.style.width = "4px";
    dot.style.height = "4px";
    dot.style.backgroundColor = "red";
    dot.style.opacity = .1;

    container.appendChild(dot);
}

function displayPoints(container, axis, sliceIdx, points) {
    const n = points.length / 3;
    for (let idx = 0; idx < n; idx++) {
        const xyz = getPointTriplet(points, idx);
        const ij = xyz2px(container, axis, sliceIdx, xyz);
        addDot(container, ij);
    }
}

class DotImage {
    constructor(state, model, dispatcher) {

        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.bitmaps = {
            'coronal': getRequiredElement(`svg-coronal-container-inner`),
            'horizontal': getRequiredElement(`svg-horizontal-container-inner`),
            'sagittal': getRequiredElement(`svg-sagittal-container-inner`),
        };

        this.el = getRequiredElement("dot-image-container");
        this.img = getRequiredElement("dot-image");
        this.closeButton = getRequiredElement("close-button");

        this.setupDotHover();
        this.setupCloseButton();
        this.setupDispatcher();
    }

    displayDots() {
        return false;

        let volume = this.model.getVolumeData(this.state.bucket, this.state.fname);
        if (volume) {
            let points = volume["xyz"].data;
            for (let axis in this.bitmaps) {
                let sliceIdx = this.state[axis];
                let container = this.bitmaps[axis];
                displayPoints(container, axis, sliceIdx, points);
            }
        }
    }

    setupDotHover() {
        this.dispatcher.on(EVENTS.FEATURE, async (ev) => {
            if (ev.isVolume) {
                this.displayDots();
            }
        });

        for (let axis in this.bitmaps) {
            this.bitmaps[axis].addEventListener('click', (ev) => {
                if (ev.ctrlKey) {
                    let sliceIdx = this.state[axis];
                    let container = this.bitmaps[axis];

                    let xyz = mouseXYZ(container, axis, sliceIdx, ev);
                    console.log(
                        `clicked on axis ${axis}, slice #${sliceIdx}, ` +
                        `x=${xyz[0].toFixed(5)}, y=${xyz[1].toFixed(5)}, z=${xyz[2].toFixed(5)}`);

                    let volume = this.model.getVolumeData(this.state.bucket, this.state.fname);
                    if (!volume) return;

                    let points = volume["xyz"].data;
                    let pointIdx = findClosestPointIndex(points, xyz);
                    let closestPoint = getPointTriplet(points, pointIdx);
                    console.log(`closest point was #${pointIdx} at ${closestPoint.map(v => v.toFixed(5))}`);

                    let url = volume["urls"].data[pointIdx];
                    if (url) {
                        this.img.src = url;
                        this.el.classList.add("shown");
                    }

                    this.dispatcher.highlightDot(this, axis, sliceIdx, xyz, ev);
                }
            });
        }
    }

    setupCloseButton() {
        this.closeButton.addEventListener("click", () => {
            this.el.classList.remove("shown");
        });
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.RESET, () => { this.hide(); });
        this.dispatcher.on(EVENTS.SLICE, () => {
            if (this.state.isVolume) {
                this.displayDots();
            }
        });
    }

    hide() {
        this.el.classList.remove("shown");
    }
};
