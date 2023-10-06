export { Cache };



/*************************************************************************************************/
/* Cache                                                                                         */
/*************************************************************************************************/

class Cache {
    constructor(download) {
        console.assert(download);
        this._downloadFunction = download;
        this._cache = new Map();
    }

    _hash(id) {
        return JSON.stringify(id);
    }

    has(...id) {
        return this._cache.has(this._hash(id));
    }

    get(...id) {
        console.log(`load ${id} from cache`);
        const idString = this._hash(id);
        console.assert(this._cache.has(idString));
        return this._cache.get(idString);
    }

    async download(...id) {
        const idString = this._hash(id);

        if (this._cache.has(idString)) {
            console.log(`load ${id} from cache`);
            return this._cache.get(idString);
        }

        const downloadPromise = this._downloadFunction(...id).then((result) => {
            console.log(`downloaded ${id}`);
            this._cache.set(idString, result);
            return result;
        });

        console.log(`save ${id} in cache`);
        this._cache.set(idString, downloadPromise);

        return await downloadPromise;
    }
};
