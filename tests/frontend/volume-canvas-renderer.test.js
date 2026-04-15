import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { hostname: 'localhost' };

const { VolumeCanvasRenderer } = await import('../../js/volume-canvas-renderer.js');

function makeFakeCanvas() {
    const context = {
        latestImageData: null,
        createImageData(width, height) {
            return { width, height, data: new Uint8ClampedArray(width * height * 4) };
        },
        putImageData(imageData) {
            this.latestImageData = imageData;
        },
    };

    return {
        width: 1,
        height: 1,
        context,
        getContext(kind) {
            assert.equal(kind, '2d');
            return context;
        },
    };
}

function makeFakeSvg() {
    return {
        attributes: {},
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
    };
}

test('VolumeCanvasRenderer updates canvas sizes and container ratios from session axis sizes', () => {
    const canvases = {
        coronal: makeFakeCanvas(),
        horizontal: makeFakeCanvas(),
        sagittal: makeFakeCanvas(),
    };
    const svgs = {
        coronal: makeFakeSvg(),
        horizontal: makeFakeSvg(),
        sagittal: makeFakeSvg(),
    };
    const containers = {
        coronal: { style: {} },
        horizontal: { style: {} },
        sagittal: { style: {} },
    };

    const renderer = new VolumeCanvasRenderer({
        canvases,
        svgs,
        containers,
        baseViewBox: {
            coronal: '0 0 100 50',
            horizontal: '0 0 90 30',
            sagittal: '0 0 80 40',
        },
        baseViewBoxSize: {
            coronal: { w: 100, h: 50 },
            horizontal: { w: 90, h: 30 },
            sagittal: { w: 80, h: 40 },
        },
    });

    renderer.updateCanvasSizes({
        axisSizes: { coronal: 3, horizontal: 2, sagittal: 4 },
    });

    assert.equal(canvases.coronal.width, 4);
    assert.equal(canvases.coronal.height, 2);
    assert.equal(canvases.horizontal.width, 4);
    assert.equal(canvases.horizontal.height, 3);
    assert.equal(canvases.sagittal.width, 3);
    assert.equal(canvases.sagittal.height, 2);
    assert.equal(svgs.coronal.attributes.viewBox, '0 0 100 50');
    assert.equal(containers.coronal.style.aspectRatio, '100 / 50');
});

test('VolumeCanvasRenderer draws a slice into the target canvas image data', () => {
    const canvases = {
        coronal: makeFakeCanvas(),
        horizontal: makeFakeCanvas(),
        sagittal: makeFakeCanvas(),
    };
    const renderer = new VolumeCanvasRenderer({
        canvases,
        svgs: { coronal: null, horizontal: null, sagittal: null },
        containers: { coronal: null, horizontal: null, sagittal: null },
        baseViewBox: {},
        baseViewBoxSize: {},
    });

    const session = {
        shape: [2, 2, 2],
        volume: new Uint8Array([
            0, 64,
            128, 192,
            255, 0,
            64, 128,
        ]),
        fortran_order: false,
        rawToAxis: { 0: 'coronal', 1: 'horizontal', 2: 'sagittal' },
        axisSizes: { coronal: 2, horizontal: 2, sagittal: 2 },
        downsample: { coronal: 1, horizontal: 1, sagittal: 1 },
    };

    renderer.updateCanvasSizes(session);
    renderer.drawSlice('coronal', 0, {
        state: { cmapmin: 0, cmapmax: 100 },
        session,
        colors: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
            [10, 11, 12],
        ],
    });

    const imageData = canvases.coronal.context.latestImageData;
    assert.equal(imageData.width, 2);
    assert.equal(imageData.height, 2);
    assert.deepEqual(Array.from(imageData.data.slice(0, 8)), [1, 2, 3, 255, 4, 5, 6, 255]);
});
