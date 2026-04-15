import { PersistentCache } from './persistent-cache.js';
import { exportSvgCollection } from './panel-export.js';
import { buildClearedStateUrl } from './core/panel-helpers.js';

export class PanelActions {
    constructor({ state, model, dispatcher, elements, source, initPanelState }) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;
        this.elements = elements;
        this.source = source;
        this.initPanelState = initPanelState;
    }

    init() {
        this.setupClearButton();
        this.setupConnectButton();
        this.setupExportButton();
        this.setupShareButton();
        this.setupResetButton();
    }

    share() {
        this.dispatcher.share(this.source);
    }

    resetView() {
        this.state.reset();
        this.dispatcher.reset(this.source);
        this.initPanelState();
        window.history.pushState(null, '', buildClearedStateUrl(window.location.href));
    }

    setupConnectButton() {
        this.elements.ibconnect.addEventListener('click', () => {
            this.dispatcher.connect(this.source);
        });
    }

    setupExportButton() {
        this.elements.ibexport.addEventListener('click', async () => {
            await exportSvgCollection({
                svgs: document.getElementsByTagName('svg'),
            });
        });
    }

    setupClearButton() {
        this.elements.ibclear.addEventListener('click', async () => {
            if (window.confirm('Are you sure you want to clear the cache and re-download the data?')) {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
                }

                await this.model.closePersistentCache();
                await PersistentCache.clearAll();
                location.reload();
            }
        });
    }

    setupResetButton() {
        this.elements.ibreset.addEventListener('click', () => {
            this.resetView();
        });
    }

    setupShareButton() {
        this.elements.ishare.addEventListener('click', () => {
            this.share();
        });
    }
}
