export { PrefetchController };

class PrefetchController {
    constructor({ delayMs = 150, hasFeature, downloadFeature }) {
        this.delayMs = delayMs;
        this.hasFeature = hasFeature;
        this.downloadFeature = downloadFeature;

        this.generation = 0;
        this.queue = [];
        this.running = false;
        this.activeController = null;
        this.activeKey = null;
    }

    _awaitTurn() {
        return new Promise((resolve) => {
            const callback = () => {
                window.setTimeout(resolve, this.delayMs);
            };

            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(callback, { timeout: 1000 });
                return;
            }

            callback();
        });
    }

    _abortActive() {
        if (this.activeController) {
            this.activeController.abort();
        }
        this.activeController = null;
        this.activeKey = null;
    }

    clear() {
        this.generation += 1;
        this.queue = [];
        this._abortActive();
    }

    schedule(tasks) {
        this.generation += 1;
        const generation = this.generation;
        this.queue = (tasks || []).map((task) => ({
            ...task,
            generation,
        }));

        if (this.queue.length === 0) {
            return;
        }

        this._drain(generation);
    }

    async _drain(generation) {
        if (this.running) return;
        this.running = true;

        try {
            while (generation === this.generation && this.queue.length > 0) {
                const task = this.queue.shift();
                if (!task) continue;

                if (task.generation !== this.generation) continue;
                if (this.hasFeature(task.bucket, task.fname)) continue;

                await this._awaitTurn();
                if (task.generation !== this.generation) continue;

                const controller = new AbortController();
                this.activeController = controller;
                this.activeKey = `${task.bucket}/${task.fname}`;

                try {
                    await this.downloadFeature(task.bucket, task.fname, {
                        prefetch: true,
                        signal: controller.signal,
                    });
                }
                catch (error) {
                    if (error?.name !== 'AbortError') {
                        console.warn(`prefetch failed for ${task.bucket}/${task.fname}`, error);
                    }
                }
                finally {
                    if (this.activeController === controller) {
                        this.activeController = null;
                        this.activeKey = null;
                    }
                }
            }
        }
        finally {
            this.running = false;

            if (generation === this.generation && this.queue.length > 0) {
                this._drain(generation);
            }
        }
    }
}
