export { Panel };

import { clamp, setOptions, throttle, displayNumber } from "./utils.js";
import { EVENTS } from "./core/events.js";
import { getRequiredElement, getRequiredSelector } from "./core/dom.js";
import { buildClearedStateUrl, fromHistogramValueRange, getOrderedColormapRange, toHistogramValueRange } from "./core/panel-helpers.js";



/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const CMAP_RANGE_THROTTLE = 250; // number of milliseconds between updates



function cloneSvgAndSetFillColors(svgElement) {
    // Get all path elements in the original SVG
    const originalPathElements = svgElement.querySelectorAll('path');
    const fillColors = new Map();

    // Loop over each path element to get the computed fill color
    originalPathElements.forEach(pathElement => {
        const fillColor = window.getComputedStyle(pathElement).fill;
        fillColors.set(pathElement, fillColor);
    });

    // Clone the SVG element
    const clonedSvg = svgElement.cloneNode(true);
    const clonedPathElements = clonedSvg.querySelectorAll('path');

    // Loop over each path element in the cloned SVG and set the fill color
    clonedPathElements.forEach((clonedPathElement, index) => {
        const originalPathElement = originalPathElements[index];
        const fillColor = fillColors.get(originalPathElement);
        clonedPathElement.style.fill = fillColor;
    });

    return clonedSvg;
}



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

async function unityScreenshot(webglCanvas) {

    // Create a new 2D canvas
    const width = webglCanvas.width;
    const height = webglCanvas.height;
    const canvas2D = document.createElement('canvas');
    canvas2D.width = width;
    canvas2D.height = height;
    const ctx2D = canvas2D.getContext('2d');

    // Draw the WebGL canvas content onto the 2D canvas
    ctx2D.drawImage(webglCanvas, 0, 0, width, height);

    // Use the toBlob method to get the PNG blob from the 2D canvas
    const pngBlob = await new Promise((resolve) => {
        canvas2D.toBlob((blob) => {
            resolve(blob);
        }, 'image/png');
    });

    return pngBlob;
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
        this.ifname = getRequiredElement('feature-dropdown');
        this.ibucket = getRequiredElement('bucket-dropdown');
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

        // Setup the event callbacks that change the global state and update the components.
        this.setupDispatcher();
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

        this.setupKeyboardShortcuts();
    }

    init() {
        // Use the state to select the initial values of the DOM elements.
        this.setState(this.state);
    }

    setState(state) {
        // Mapping.
        this.setMapping(state.mapping);

        // Stat.
        this.setStat(state.stat);

        // Colormap.
        this.setCmap(state.cmap);

        // Colormap range.
        this.setCmapRange(state.cmapmin, state.cmapmax);

        // Log scale.
        this.setLogScale(state.logScale);

        // Panel open.
        this.setOpen(state.panelOpen);
    }

    setupDispatcher() {
        this.dispatcher.on(EVENTS.MAPPING, (ev, source) => {
            if (source != this && ev.name)
                this.imapping.value = ev.name;
        });

        // Display the cmap range once the features are loaded.
        this.dispatcher.on(EVENTS.FEATURE, (ev, source, fname) => {
            const [vminMod, vmaxMod] = this._toMinMaxValues(this.state.cmapmin, this.state.cmapmax);
            this.icmapminInput.value = displayNumber(vminMod);
            this.icmapmaxInput.value = displayNumber(vmaxMod);

            let cmap = this.model.getCmap(this.state.bucket, this.state.fname);
            if (cmap) {
                this.icmap.value = cmap;
                this.state.cmap = cmap;
                this.dispatcher.cmap(cmap);
            }
        });
    }

    /* Set functions                                                                             */
    /*********************************************************************************************/

    setOpen(open) {
        if (open)
            this.el.open = true;
        else
            this.el.removeAttribute("open");

        this.el.addEventListener('toggle', (ev) => {
            this.state.setPanelOpen(this.el.open);
            this.dispatcher.panel(this, { 'open': this.state.panelOpen });
        })
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

    async setCmapRange(cmin, cmax) {
        this.icmapmin.value = cmin;
        this.icmapmax.value = cmax;

        // let [vminMod, vmaxMod] = this._toMinMaxValues(cmin, cmax);
        // this.icmapminInput.value = vminMod;
        // this.icmapmaxInput.value = vmaxMod;
    }

    setLogScale(logScale) {
        console.log("pseudo log scale", logScale);
        this.iclog.checked = logScale;
    }

    share() {
        this.dispatcher.share(this);
    }

    // if (this.unity)
    //     this.unity.update();
    // }

    /* Setup functions                                                                           */
    /*********************************************************************************************/

    setupMapping() {
        this.imapping.addEventListener('change', (e) => {
            this.state.setMapping(this.imapping.value);
            this.dispatcher.mapping(this, this.state.mapping);
        });
    }

    setupStat() {
        this.istat.addEventListener('change', (e) => {
            this.state.setStat(this.istat.value);
            this.dispatcher.stat(this, this.state.stat);
        });
    }

    setupColormap() {
        this.icmap.addEventListener('change', async (e) => {
            this.state.setCmap(this.icmap.value);
            this.dispatcher.cmap(this, this.state.cmap);
        });
    }

    _updateColormapRange(cmin, cmax) {

        this.state.setCmapRange(cmin, cmax);

        this.dispatcher.cmapRange(this, cmin, cmax);
    }

    _toMinMaxValues(cmin, cmax) {
        const hist = this.model.getHistogram(this.state.bucket, this.state.fname);
        return toHistogramValueRange(cmin, cmax, hist);
    }

    _fromMinMaxValues(vminMod, vmaxMod) {
        const hist = this.model.getHistogram(this.state.bucket, this.state.fname);
        return fromHistogramValueRange(vminMod, vmaxMod, hist);
    }

    setupColormapRange() {

        // Slider.
        let onSlider = throttle(() => {
            const [cmin, cmax] = getOrderedColormapRange(this.icmapmin.value, this.icmapmax.value);
            this._updateColormapRange(cmin, cmax);

            const [vminMod, vmaxMod] = this._toMinMaxValues(cmin, cmax);
            this.icmapminInput.value = displayNumber(vminMod);
            this.icmapmaxInput.value = displayNumber(vmaxMod);

        }, CMAP_RANGE_THROTTLE);

        this.icmapmin.addEventListener('input', onSlider);
        this.icmapmax.addEventListener('input', onSlider);
    }

    setupLogScale() {
        this.iclog.addEventListener(
            'change', (e) => {
                this.state.logScale = e.target.checked;
                this.dispatcher.logScale(this, this.state.logScale);
            });
    }

    /* Buttons                                                                                   */
    /*********************************************************************************************/

    setupConnectButton() {
        this.ibconnect.addEventListener('click', (e) => {
            this.dispatcher.connect(this);
        });
    }

    setupExportButton() {
        this.ibexport.addEventListener('click', async (e) => {

            const svgs = document.getElementsByTagName("svg");
            const zip = new JSZip();

            for (let svg of svgs) {
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

            // NOTE: not working yet
            // Unity canvas.
            // const pngBlob = unityScreenshot(document.getElementById("unity-canvas"));
            // zip.file(`3D-view.png`, pngBlob);

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, 'svgs.zip');
        });
    }

    setupClearButton() {
        this.ibclear.addEventListener('click', (e) => {
            if (window.confirm("Are you sure you want to clear the cache and re-download the data?")) {

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
        this.ibreset.addEventListener('click', (e) => {
            // if (window.confirm("Are you sure you want to reset the view?")) {
            this.state.reset(); // NOTE: this keeps the list of buckets intact
            this.dispatcher.reset(this);

            // Update the panel controls.
            this.init();

            // Reset the browser URL.
            window.history.pushState(null, '', buildClearedStateUrl(window.location.href));
            // }
        });
    }

    setupShareButton() {
        this.ishare.addEventListener('click', (e) => {
            this.share();
        });
    }

    /* Keyboard functions                                                                        */
    /*********************************************************************************************/

    setupKeyboardShortcuts() {
        // window.addEventListener('keypress', (e) => {
        //     // NOTE: do not trigger the event when filling in the search bar
        //     if (e.target.id != "search-input") {

        //         // Cycle through the feature names.
        //         if (e.key == "f" || e.key == "d") {
        //             let dir = e.key == "f" ? +1 : -1;
        //             // this.ifname.selectedIndex = clamp(this.ifname.selectedIndex + dir, 0, this.ifname.length - 1);
        //             // this.setFname(this.ifname.value);
        //         }
        //     }
        // });
    }
};
