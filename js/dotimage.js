export { DotImage };

import { clamp } from "./utils.js";
import { VOLUME_SIZE, VOLUME_XY_AXES, ij2xyz } from "./constants.js";



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

function mouseXYZ(container, axis, sliceIdx, ev) {
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

        this.setupDotHover();
        this.setupDispatcher();
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupDotHover() {
        for (let axis in this.bitmaps) {
            this.bitmaps[axis].addEventListener('mousemove', (ev) => {
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

                    // Emit the event.
                    this.dispatcher.highlightDot(this, axis, sliceIdx, xyz, ev);
                }
            });
        }
    }

    setupDispatcher() {
        this.dispatcher.on('reset', (ev) => { this.hide(); });
    }
};
