export { Help };

import { getRequiredElement } from "./core/dom.js";

class Help {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.trigger = getRequiredElement('help-button');
        this.modal = getRequiredElement('help-modal');
        this.dialog = getRequiredElement('help-dialog');
        this.closeButton = getRequiredElement('help-close');
        this.content = getRequiredElement('help-content');

        this.contentLoaded = false;
        this.lastFocusedElement = null;
    }

    init() {
        this.trigger.addEventListener('click', (e) => {
            e.preventDefault();
            this.open();
        });

        this.closeButton.addEventListener('click', () => this.close());

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('visible')) {
                this.close();
            }
        });
    }

    async loadContent() {
        if (this.contentLoaded) return;

        this.content.innerHTML = '<div class="help-loading">Loading help…</div>';
        try {
            const response = await fetch('/help/help-content.html', { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`Failed to load help content (${response.status})`);
            }
            this.content.innerHTML = await response.text();
            this.contentLoaded = true;
        } catch (error) {
            console.error(error);
            this.content.innerHTML = `
                <div class="help-error">
                    <h3>Help content unavailable</h3>
                    <p>The help content file could not be loaded.</p>
                    <p>Expected file: <code>/help/help-content.html</code></p>
                </div>
            `;
        }
    }

    async open() {
        this.lastFocusedElement = document.activeElement;
        await this.loadContent();
        this.modal.classList.add('visible');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('help-open');
        this.trigger.setAttribute('aria-expanded', 'true');
        this.closeButton.focus();
    }

    close() {
        this.modal.classList.remove('visible');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('help-open');
        this.trigger.setAttribute('aria-expanded', 'false');
        if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
            this.lastFocusedElement.focus();
        }
    }
}
