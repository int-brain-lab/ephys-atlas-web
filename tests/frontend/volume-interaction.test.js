import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { hostname: 'localhost' };

const {
    getVolumeHoverValues,
    getVolumeSliceIndexFromState,
} = await import('../../js/volume-interaction.js');

test('getVolumeSliceIndexFromState converts slider position using session downsample', () => {
    const index = getVolumeSliceIndexFromState('coronal', {
        coronal: 25,
    }, {
        axisSizes: { coronal: 20 },
        downsample: { coronal: 1 },
    });

    assert.equal(index, 10);
});

test('getVolumeHoverValues resolves denormalized values for hovered voxel', () => {
    const hover = getVolumeHoverValues({
        axis: 'coronal',
        event: { clientX: 50, clientY: 75 },
        state: {
            isVolume: true,
            coronal: 0,
        },
        session: {
            shape: [2, 2, 2],
            rawToAxis: { 0: 'coronal', 1: 'horizontal', 2: 'sagittal' },
            fortran_order: false,
            axisSizes: { coronal: 2, horizontal: 2, sagittal: 2 },
            downsample: { coronal: 1, horizontal: 1, sagittal: 1 },
            volumeArrays: {
                mean: {
                    data: new Uint8Array([0, 64, 128, 192, 255, 0, 64, 128]),
                    bounds: [10, 20],
                },
            },
        },
        container: {
            getBoundingClientRect() {
                return { left: 0, top: 0, width: 100, height: 100 };
            },
        },
    });

    assert.deepEqual(hover.axisCoords, [0, 1, 1]);
    assert.equal(hover.dataIndex, 3);
    assert.equal(hover.values.mean, 10 + (192 / 255) * 10);
});

test('getVolumeHoverValues returns null when no usable values are present', () => {
    const hover = getVolumeHoverValues({
        axis: 'coronal',
        event: { clientX: 10, clientY: 10 },
        state: { isVolume: true, coronal: 0 },
        session: {
            shape: [2, 2, 2],
            rawToAxis: { 0: 'coronal', 1: 'horizontal', 2: 'sagittal' },
            fortran_order: false,
            axisSizes: { coronal: 2, horizontal: 2, sagittal: 2 },
            downsample: { coronal: 1, horizontal: 1, sagittal: 1 },
            volumeArrays: {},
        },
        container: {
            getBoundingClientRect() {
                return { left: 0, top: 0, width: 100, height: 100 };
            },
        },
    });

    assert.equal(hover, null);
});
