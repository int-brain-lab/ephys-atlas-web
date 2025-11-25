export { Panel };

import { clamp, setOptions, throttle, displayNumber } from "./utils.js";



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

        this.el = document.querySelector('#control-panel details');
        this.imapping = document.getElementById('mapping-dropdown');
        this.ifname = document.getElementById('feature-dropdown');
        this.ibucket = document.getElementById('bucket-dropdown');
        this.icmap = document.getElementById('colormap-dropdown');
        this.istat = document.getElementById('stat-dropdown');
        this.icmapmin = document.getElementById('colormap-min');
        this.icmapmax = document.getElementById('colormap-max');
        this.icmapminInput = document.getElementById('colormap-min-input');
        this.icmapmaxInput = document.getElementById('colormap-max-input');
        this.iclog = document.getElementById('log-scale');
        this.ichn = document.getElementById('histogram-normalization');
        this.ibreset = document.getElementById('reset-view-button');
        this.ibclear = document.getElementById('clear-cache-button');
        this.ibconnect = document.getElementById('connect-button');
        this.ibexport = document.getElementById('export-button');
        this.ishare = document.getElementById('share-button');

        // Setup the event callbacks that change the global state and update the components.
        this.setupDispatcher();
        this.setupMapping();
        this.setupStat();
        this.setupColormap();
        this.setupColormapRange();
        this.setupLogScale();
        this.setupHistogramNormalization();

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

        // Histogram normalization.
        this.setHistogramNormalization(state.histogramNormalization);

        // Panel open.
        this.setOpen(state.panelOpen);
    }

    setupDispatcher() {
        this.dispatcher.on('mapping', (ev, source) => {
            if (source != this && ev.name)
                this.imapping.value = ev.name;
        });

        // Display the cmap range once the features are loaded.
        this.dispatcher.on('feature', (ev, source, fname) => {
            let [vminMod, vmaxMod] = this._toMinMaxValues(this.state.cmapmin, this.state.cmapmax);
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
            this.state.panelOpen = this.el.open;
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

    setHistogramNormalization(normalized) {
        console.log("histogram normalized", normalized);
        this.ichn.checked = normalized;
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
            this.state.mapping = this.imapping.value;
            this.dispatcher.mapping(this, this.state.mapping);
        });
    }

    setupStat() {
        this.istat.addEventListener('change', (e) => {
            this.state.stat = this.istat.value;
            this.dispatcher.stat(this, this.state.stat);
        });
    }

    setupColormap() {
        this.icmap.addEventListener('change', async (e) => {
            this.state.cmap = this.icmap.value;
            this.dispatcher.cmap(this, this.state.cmap);
        });
    }

    _updateColormapRange(cmin, cmax) {

        this.state.cmapmin = cmin;
        this.state.cmapmax = cmax;

        this.dispatcher.cmapRange(this, cmin, cmax);
    }

    _toMinMaxValues(cmin, cmax) {
        let hist = this.state.isVolume ? null : this.model.getHistogram(this.state.bucket, this.state.fname);
        if (!hist) return [0, 0];
        let vmin = hist['vmin'];
        let vmax = hist['vmax'];
        let vdiff = vmax - vmin;
        let vminMod = vmin + vdiff * cmin / 100.0;
        let vmaxMod = vmin + vdiff * cmax / 100.0;
        return [vminMod, vmaxMod];
    }

    _fromMinMaxValues(vminMod, vmaxMod) {
        let hist = this.state.isVolume ? null : this.model.getHistogram(this.state.bucket, this.state.fname);
        if (!hist) return [0, 0];
        let vmin = hist['vmin'];
        let vmax = hist['vmax'];
        let vdiff = vmax - vmin;
        let cmin = (vminMod - vmin) * 100.0 / vdiff;
        let cmax = (vmaxMod - vmin) * 100.0 / vdiff;
        return [cmin, cmax];
    }

    setupColormapRange() {

        // Slider.
        let onSlider = throttle((e) => {
            let cmin = Math.min(this.icmapmin.value, this.icmapmax.value);
            let cmax = Math.max(this.icmapmin.value, this.icmapmax.value);
            this._updateColormapRange(cmin, cmax);

            // Update the input number fields.
            let [vminMod, vmaxMod] = this._toMinMaxValues(cmin, cmax);

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

    setupHistogramNormalization() {
        this.ichn.addEventListener(
            'change', (e) => {
                this.state.histogramNormalization = e.target.checked;
                this.dispatcher.toggleNormalization(this, this.state.histogramNormalization);
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
            const url = new URL(window.location);
            url.searchParams.set('state', '');
            window.history.pushState(null, '', url.toString());
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
