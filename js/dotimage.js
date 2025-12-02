export { DotImage };

import { clamp } from "./utils.js";
import { getVolumeSize, VOLUME_XY_AXES, ij2xyz, xyz2ij } from "./constants.js";



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

function mouseXYZ(container, axis, sliceIdx, ev) {
    const VOLUME_SIZE = getVolumeSize();
    let rect = container.getBoundingClientRect();

    // Calculate relative coordinates
    let relativeX = (ev.clientX - rect.left) / rect.width;
    let relativeY = (ev.clientY - rect.top) / rect.height;

    // Ensure relative coordinates are within [0, 1] range
    relativeX = clamp(relativeX, 0, 1);
    relativeY = clamp(relativeY, 0, 1);

    let i = VOLUME_SIZE[VOLUME_XY_AXES[axis][0]] * relativeX;
    let j = VOLUME_SIZE[VOLUME_XY_AXES[axis][1]] * relativeY;

    let xyz = ij2xyz(axis, sliceIdx, i, j);
    return xyz;
}

function xyz2px(container, axis, sliceIdx, xyz) {
    const VOLUME_SIZE = getVolumeSize();
    let canvasWidth = container.clientWidth;
    let canvasHeight = container.clientHeight;

    // Calculate the relative position of the XYZ point within the volume
    let [i, j] = xyz2ij(axis, sliceIdx, xyz);

    // Calculate the pixel coordinates based on the slice and projection
    let x, y;
    if (axis === "coronal") {
        x = (i / VOLUME_SIZE.sagittal) * canvasWidth;
        y = (j / VOLUME_SIZE.horizontal) * canvasHeight;
    } else if (axis === "horizontal") {
        x = (i / VOLUME_SIZE.sagittal) * canvasWidth;
        y = (j / VOLUME_SIZE.coronal) * canvasHeight;
    } else if (axis === "sagittal") {
        x = (i / VOLUME_SIZE.coronal) * canvasWidth;
        y = (j / VOLUME_SIZE.horizontal) * canvasHeight;
    }

    return [x, y];
}

function findClosest(points, point) {
    // NOTE: one-dimensional 3*N array with the xyz values interleaved
    if (points.length % 3 !== 0) {
        throw new Error('Invalid input: points array length must be a multiple of 3.');
    }

    if (point.length !== 3) {
        throw new Error('Invalid input: point must contain three coordinates (x, y, z).');
    }

    let closestIndex = -1;
    let closestDistance = Infinity;

    for (let i = 0; i < points.length; i += 3) {
        const xDiff = points[i] - point[0];
        const yDiff = points[i + 1] - point[1];
        const zDiff = points[i + 2] - point[2];

        const distance = xDiff * xDiff + yDiff * yDiff + zDiff * zDiff;

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i / 3; // Adjust index to represent the index of the point in the array
        }
    }

    return closestIndex;
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
        let x = points[3 * idx + 0];
        let y = points[3 * idx + 1];
        let z = points[3 * idx + 2];
        let xyz = [x, y, z];
        let ij = xyz2px(container, axis, sliceIdx, xyz);
        addDot(container, ij);
    }
}


/*************************************************************************************************/
/* DotImage                                                                                       */
/*************************************************************************************************/

class DotImage {
    constructor(state, model, dispatcher) {

        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        // Bitmaps.
        this.bitmaps = {
            'coronal': document.getElementById(`svg-coronal-container-inner`),
            'horizontal': document.getElementById(`svg-horizontal-container-inner`),
            'sagittal': document.getElementById(`svg-sagittal-container-inner`),
        };

        this.el = document.getElementById("dot-image-container");
        this.img = document.getElementById("dot-image");
        this.closeButton = document.getElementById("close-button");

        this.setupDotHover();
        this.setupCloseButton();
        this.setupDispatcher();
    }

    displayDots() {
        // DEBUG
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

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDotHover() {
        this.dispatcher.on('feature', async (ev) => {
            if (ev.isVolume) {
                this.displayDots();
            }
        });

        for (let axis in this.bitmaps) {
            this.bitmaps[axis].addEventListener('click', (ev) => {
                if (ev.ctrlKey) {
                    let sliceIdx = this.state[axis];
                    let container = this.bitmaps[axis];

                    // Find the xyz volume coordinates of the clicked point.
                    let xyz = mouseXYZ(container, axis, sliceIdx, ev);
                    console.log(
                        `clicked on axis ${axis}, slice #${sliceIdx}, ` +
                        `x=${xyz[0].toFixed(5)}, y=${xyz[1].toFixed(5)}, z=${xyz[2].toFixed(5)}`);

                    let volume = this.model.getVolumeData(this.state.bucket, this.state.fname);
                    if (!volume) return;

                    let points = volume["xyz"].data;
                    let pointIdx = findClosest(points, xyz);
                    let xClosest = points[pointIdx + 0].toFixed(5);
                    let yClosest = points[pointIdx + 1].toFixed(5);
                    let zClosest = points[pointIdx + 2].toFixed(5);
                    console.log(`closest point was #${pointIdx} at ${[xClosest, yClosest, zClosest]}`);

                    let url = volume["urls"].data[pointIdx];
                    if (url) {
                        this.img.src = url;
                        this.el.classList.add("shown");
                    }

                    // Emit the event.
                    this.dispatcher.highlightDot(this, axis, sliceIdx, xyz, ev);
                }
            });
        }
    }

    setupCloseButton() {
        this.closeButton.addEventListener("click", (ev) => {
            this.el.classList.remove("shown");
        });
    }

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.hide(); });
        this.dispatcher.on('slice', (ev) => {
            if (this.state.isVolume) {
                this.displayDots();
            }
        });
    }
};
