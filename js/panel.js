export { Panel };

import { throttle } from "./utils.js";
import { EVENTS } from "./core/events.js";
import { getRequiredElement, getRequiredSelector } from "./core/dom.js";
import {
    buildClearedStateUrl,
    buildPanelColormapRangeView,
    getOrderedColormapRange,
} from "./core/panel-helpers.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const CMAP_RANGE_THROTTLE = 250; // number of milliseconds between updates



function cloneSvgAndSetFillColors(svgElement) {
    const originalPathElements = svgElement.querySelectorAll('path');
    const fillColors = new Map();

    originalPathElements.forEach(pathElement => {
        const fillColor = window.getComputedStyle(pathElement).fill;
        fillColors.set(pathElement, fillColor);
    });

    const clonedSvg = svgElement.cloneNode(true);
    const clonedPathElements = clonedSvg.querySelectorAll('path');

    clonedPathElements.forEach((clonedPathElement, index) => {
        const originalPathElement = originalPathElements[index];
        const fillColor = fillColors.get(originalPathElement);
        clonedPathElement.style.fill = fillColor;
    });

    return clonedSvg;
}



/*************************************************************************************************/
/* Panel                                                                                         */
/*************************************************************************************************/

class Panel {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.el = getRequiredSelector('#control-panel details');
        this.imapping = getRequiredElement('mapping-dropdown');
        this.icmap = getRequiredElement('colormap-dropdown');
        this.istat = getRequiredElement('stat-dropdown');
        this.icmapmin = getRequiredElement('colormap-min');
        this.icmapmax = getRequiredElement('colormap-max');
        this.icmapminInput = getRequiredElement('colormap-min-input');
        this.icmapmaxInput = getRequiredElement('colormap-max-input');
        this.iclog = getRequiredElement('log-scale');
        this.ibreset = getRequiredElement('reset-view-button');
        this.ibclear = getRequiredElement('clear-cache-button');
        this.ibconnect = getRequiredElement('connect-button');
        this.ibexport = getRequiredElement('export-button');
        this.ishare = getRequiredElement('share-button');

        this.setupDispatcher();
        this.setupPanelToggle();
        this.setupMapping();
        this.setupStat();
        this.setupColormap();
        this.setupColormapRange();
        this.setupLogScale();
        this.setupClearButton();
        this.setupConnectButton();
        this.setupExportButton();
        this.setupShareButton();
        this.setupResetButton();
    }

    init() {
        this.setState(this.state);
    }

    setState(state) {
        this.setMapping(state.mapping);
        this.setStat(state.stat);
        this.setCmap(state.cmap);
        this.renderColormapRange(this.buildColormapRangeView(state.cmapmin, state.cmapmax));
        this.setLogScale(state.logScale);
        this.setOpen(state.panelOpen);
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.MAPPING, (ev, source) => {
            if (source !== this && ev.name) {
                this.imapping.value = ev.name;
            }
        });

        this.dispatcher.on(EVENTS.FEATURE, () => {
            this.syncFeatureControls();
        });
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    setOpen(open) {
        if (open) {
            this.el.open = true;
        } else {
            this.el.removeAttribute('open');
        }
    }

    setMapping(mapping) {
        this.imapping.value = mapping;
    }

    setStat(stat) {
        this.istat.value = stat;
    }

    setCmap(cmap) {
        this.icmap.value = cmap;
    }

    setLogScale(logScale) {
        this.iclog.checked = logScale;
    }

    share() {
        this.dispatcher.share(this);
    }

    getHistogram() {
        return this.model.getHistogram(this.state.bucket, this.state.fname);
    }

    buildColormapRangeView(cmin, cmax) {
        return buildPanelColormapRangeView(cmin, cmax, this.getHistogram());
    }

    renderColormapRange(view) {
        this.icmapmin.value = view.sliderMin;
        this.icmapmax.value = view.sliderMax;
        this.icmapminInput.value = view.displayMin;
        this.icmapmaxInput.value = view.displayMax;
    }

    updateColormapRange(cmin, cmax) {
        this.state.setCmapRange(cmin, cmax);
        this.dispatcher.cmapRange(this, cmin, cmax);
    }

    syncFeatureControls() {
        this.renderColormapRange(this.buildColormapRangeView(this.state.cmapmin, this.state.cmapmax));

        const cmap = this.model.getCmap(this.state.bucket, this.state.fname);
        if (cmap) {
            this.icmap.value = cmap;
            this.state.cmap = cmap;
            this.dispatcher.cmap(this, cmap);
        }
    }

    resetView() {
        this.state.reset();
        this.dispatcher.reset(this);
        this.init();
        window.history.pushState(null, '', buildClearedStateUrl(window.location.href));
    }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupPanelToggle() {
        this.el.addEventListener('toggle', () => {
            this.state.setPanelOpen(this.el.open);
            this.dispatcher.panel(this, { open: this.state.panelOpen });
        });
    }

    setupMapping() {
        this.imapping.addEventListener('change', () => {
            this.state.setMapping(this.imapping.value);
            this.dispatcher.mapping(this, this.state.mapping);
        });
    }

    setupStat() {
        this.istat.addEventListener('change', () => {
            this.state.setStat(this.istat.value);
            this.dispatcher.stat(this, this.state.stat);
        });
    }

    setupColormap() {
        this.icmap.addEventListener('change', () => {
            this.state.setCmap(this.icmap.value);
            this.dispatcher.cmap(this, this.state.cmap);
        });
    }

    setupColormapRange() {
        const onSlider = throttle(() => {
            const [cmin, cmax] = getOrderedColormapRange(this.icmapmin.value, this.icmapmax.value);
            this.updateColormapRange(cmin, cmax);
            this.renderColormapRange(this.buildColormapRangeView(cmin, cmax));
        }, CMAP_RANGE_THROTTLE);

        this.icmapmin.addEventListener('input', onSlider);
        this.icmapmax.addEventListener('input', onSlider);
    }

    setupLogScale() {
        this.iclog.addEventListener('change', (e) => {
            this.state.logScale = e.target.checked;
            this.dispatcher.logScale(this, this.state.logScale);
        });
    }

    /* Buttons                                                                                   */
    /*********************************************************************************************/

    setupConnectButton() {
        this.ibconnect.addEventListener('click', () => {
            this.dispatcher.connect(this);
        });
    }

    setupExportButton() {
        this.ibexport.addEventListener('click', async () => {
            const svgs = document.getElementsByTagName('svg');
            const zip = new JSZip();

            for (const svg of svgs) {
                const svgClone = cloneSvgAndSetFillColors(svg);
                const svgData = new XMLSerializer().serializeToString(svgClone);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                const img = new Image();

                await new Promise((resolve) => {
                    img.onload = () => {
                        canvas.width = 10 * img.width;
                        canvas.height = 10 * img.height;
                        context.drawImage(img, 0, 0);
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    img.src = url;
                });

                const pngBlob = await new Promise((resolve) => {
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/png');
                });

                const id = svg.getAttribute('id') || `svg-${Math.random().toString(36).substr(2, 9)}`;
                zip.file(`${id}.png`, pngBlob);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, 'svgs.zip');
        });
    }

    setupClearButton() {
        this.ibclear.addEventListener('click', () => {
            if (window.confirm('Are you sure you want to clear the cache and re-download the data?')) {
                if ('caches' in window) {
                    caches.keys().then(cacheNames => {
                        cacheNames.forEach(cacheName => {
                            caches.delete(cacheName);
                        });
                    });
                }

                location.reload();
            }
        });
    }

    setupResetButton() {
        this.ibreset.addEventListener('click', () => {
            this.resetView();
        });
    }

    setupShareButton() {
        this.ishare.addEventListener('click', () => {
            this.share();
        });
    }
};
