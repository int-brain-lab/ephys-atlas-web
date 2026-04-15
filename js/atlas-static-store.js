import { Loader } from './loader.js';

export class AtlasStaticStore {
    constructor({ splash, urls }) {
        this.splash = splash;
        this.urls = urls;
        this.loaders = {
            colormaps: new Loader(splash, urls.colormaps, [1, 1, 1]),
            regions: new Loader(splash, urls.regions, [2, 3, 1]),
            slices_sagittal: new Loader(splash, urls.slices('sagittal'), [10, 0, 5]),
            slices_coronal: new Loader(splash, urls.slices('coronal'), [10, 0, 5]),
            slices_horizontal: new Loader(splash, urls.slices('horizontal'), [10, 0, 5]),
            slices_top: new Loader(splash, urls.slices('top'), [2, 0, 2]),
            slices_swanson: new Loader(splash, urls.slices('swanson'), [2, 0, 2]),
        };
    }

    async load() {
        const pending = [];
        for (const loaderName in this.loaders) {
            console.debug(`start loader '${loaderName}'`);
            pending.push(this.loaders[loaderName].start());
        }
        await Promise.all(pending);
    }

    getColormap(cmap) {
        console.assert(cmap);
        const colors = this.loaders.colormaps.get(cmap);
        console.assert(colors);
        console.assert(colors.length > 0);
        return colors;
    }

    getRegions(mapping) {
        console.assert(mapping);
        const regions = this.loaders.regions.get(mapping);

        const kept = {};
        for (const relidx in regions) {
            const region = regions[relidx];
            const regionIdx = region.idx;
            if (mapping == 'allen' && !region.leaf) {
                continue;
            }
            kept[regionIdx] = region;
        }

        console.assert(kept);
        console.assert(Object.keys(kept).length > 0);
        return kept;
    }

    getSlice(axis, idx) {
        console.assert(axis);
        console.assert(this.loaders[`slices_${axis}`]);
        return this.loaders[`slices_${axis}`].get((idx || 0).toString());
    }
}
