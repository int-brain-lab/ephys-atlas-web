import { VOLUME_AXES, VOLUME_SIZE, getVolumeSize, setVolumeSizeDynamic } from './constants.js';
import { computeAxisMapping } from './core/volume-helpers.js';

const DEFAULT_DOWNSAMPLE = { coronal: 1, horizontal: 1, sagittal: 1 };

export class VolumeSession {
    constructor() {
        this.reset();
    }

    reset() {
        this.shape = null;
        this.volume = null;
        this.fortran_order = null;
        this.bounds = null;
        this.axisSizes = getVolumeSize();
        this.axisToRaw = null;
        this.rawToAxis = null;
        this.downsample = { ...DEFAULT_DOWNSAMPLE };
        this.activeVolumeName = null;
        this.volumeArrays = {};
        setVolumeSizeDynamic(null);
    }

    loadVolumeEntries(volumePayload) {
        this.volumeArrays = {};
        if (!volumePayload?.volumes) {
            return this.volumeArrays;
        }

        for (const [name, entry] of Object.entries(volumePayload.volumes)) {
            if (entry && entry.volume) {
                const loadedVolume = entry.volume;
                if (entry.bounds && entry.bounds.length >= 2) {
                    loadedVolume.bounds = entry.bounds;
                }
                this.volumeArrays[name] = loadedVolume;
            }
        }
        return this.volumeArrays;
    }

    getPreferredVolumeName() {
        if (this.volumeArrays.mean) {
            return 'mean';
        }
        return Object.keys(this.volumeArrays)[0] || null;
    }

    computeAxisMapping(shape) {
        const mapping = computeAxisMapping(shape, VOLUME_SIZE, VOLUME_AXES);
        console.log('volume axis mapping', mapping.axisToRaw, 'axis sizes', mapping.axisSizes, 'downsample', mapping.downsample);
        return mapping;
    }

    setArray(arr, volumeName = null) {
        if (!arr) {
            this.reset();
            return null;
        }

        this.shape = Array.from(arr.shape);
        this.volume = arr.data;
        this.fortran_order = arr.fortran_order;
        this.bounds = arr.bounds;
        this.activeVolumeName = volumeName;
        console.log(
            'array is loaded, shape is', this.shape,
            'bounds are:', this.bounds[0], this.bounds[1],
            'fortran order:', this.fortran_order,
        );

        const mapping = this.computeAxisMapping(this.shape);
        this.axisToRaw = mapping.axisToRaw;
        this.rawToAxis = mapping.rawToAxis;
        this.axisSizes = mapping.axisSizes;
        this.downsample = mapping.downsample;
        setVolumeSizeDynamic(this.axisSizes);
        return mapping;
    }
}
