import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { hostname: 'localhost' };

const { VolumeSession } = await import('../../js/volume-session.js');

test('VolumeSession loads volume entries and prefers mean when available', () => {
    const session = new VolumeSession();
    const payload = {
        volumes: {
            std: { volume: { shape: [1, 1, 1], fortran_order: false, data: [1] }, bounds: [0, 1] },
            mean: { volume: { shape: [1, 1, 1], fortran_order: false, data: [2] }, bounds: [2, 3] },
        },
    };

    session.loadVolumeEntries(payload);
    assert.deepEqual(Object.keys(session.volumeArrays), ['std', 'mean']);
    assert.equal(session.volumeArrays.mean.bounds[0], 2);
    assert.equal(session.getPreferredVolumeName(), 'mean');
});

test('VolumeSession setArray updates axis mapping and reset clears state', () => {
    const session = new VolumeSession();
    const mapping = session.setArray({
        shape: [528, 320, 456],
        fortran_order: false,
        data: new Uint8Array(528 * 320 * 456),
        bounds: [0, 1],
    }, 'mean');

    assert.equal(session.activeVolumeName, 'mean');
    assert.deepEqual(mapping.axisSizes, { coronal: 528, horizontal: 320, sagittal: 456 });
    assert.equal(session.shape[0], 528);
    session.reset();
    assert.equal(session.shape, null);
    assert.deepEqual(session.volumeArrays, {});
});
