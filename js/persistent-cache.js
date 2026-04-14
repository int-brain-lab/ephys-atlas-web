export { PersistentCache };

const DB_NAME = 'atlasPersistentCache';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

class PersistentCache {
    constructor() {
        this.supported = typeof indexedDB !== 'undefined';
        this.dbPromise = this.supported ? this._open() : Promise.resolve(null);
    }

    async _open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                }
            };
        }).catch((error) => {
            console.warn('unable to open persistent cache', error);
            return null;
        });
    }

    async _withStore(mode, callback) {
        const db = await this.dbPromise;
        if (!db) {
            return null;
        }

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, mode);
            const store = tx.objectStore(STORE_NAME);
            let result = null;

            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);

            callback(store, (value) => {
                result = value;
            });
        }).catch((error) => {
            console.warn('persistent cache operation failed', error);
            return null;
        });
    }

    async close() {
        const db = await this.dbPromise;
        if (db) {
            db.close();
        }
    }

    async get(key) {
        return this._withStore('readonly', (store, setResult) => {
            const request = store.get(key);
            request.onsuccess = () => setResult(request.result || null);
        });
    }

    async set(key, value) {
        return this._withStore('readwrite', (store, setResult) => {
            store.put({ key, ...value });
            setResult(true);
        });
    }

    async delete(key) {
        return this._withStore('readwrite', (store, setResult) => {
            store.delete(key);
            setResult(true);
        });
    }

    static async clearAll() {
        if (typeof indexedDB === 'undefined') {
            return;
        }

        await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(DB_NAME);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
                console.warn('persistent cache deletion blocked by an open connection');
                resolve();
            };
        }).catch((error) => {
            console.warn('unable to clear persistent cache', error);
        });
    }
}
