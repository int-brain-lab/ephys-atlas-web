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

    _doRefresh(id) {
        // Determine if the last argument to download() is an object with refresh=true.
        let last = id[id.length - 1];
        if (last != undefined && typeof last === 'object') {
            return last.refresh;
        }
        return false;
    }

    _hash(id_) {
        // Make a copy to avoid modifying the original object.
        let id = [...id_];

        // HACK: remove optional "options" object from the ID
        let last = id[id.length - 1];
        if (last == undefined || typeof last === 'object') {
            id.pop();
        }
        return JSON.stringify(id);
    }

    has(...id) {
        return this._cache.has(this._hash(id));
    }

    get(...id) {
        // console.log(`load ${id} from cache`);
        const idString = this._hash(id);
        console.assert(this._cache.has(idString));
        return this._cache.get(idString);
    }

    async download(...id) {
        const idString = this._hash(id);

        const refresh = this._doRefresh(id);
        if (!refresh && this._cache.has(idString)) {
            // console.log(`load ${id} from cache`);
            return this._cache.get(idString);
        }

        const downloadPromise = this._downloadFunction(...id).then((result) => {
            console.log(`finish downloading ${id}`);
            this._cache.set(idString, result);
            return result;
        });

        // console.log(`save ${id} in cache`);
        this._cache.set(idString, downloadPromise);

        return await downloadPromise;
    }
};
