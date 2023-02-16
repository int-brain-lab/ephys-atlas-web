
/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const DB_NAME = "IBLEphysAtlasDatabase";
const DB_VERSION = 1;



/*************************************************************************************************/
/* SVG downloading                                                                               */
/*************************************************************************************************/

async function downloadSlices() {
    return downloadJSON(`/data/slices.json`);
}



/*************************************************************************************************/
/* Features                                                                                      */
/*************************************************************************************************/

async function downloadFeatures() {
    return downloadJSON(`/data/features.json`);
}



/*************************************************************************************************/
/* SVG local database                                                                            */
/*************************************************************************************************/

function deleteDatabase() {
    console.log("deleting the database");
    Dexie.delete(DB_NAME);
}



/*************************************************************************************************/
/* SVG class                                                                                     */
/*************************************************************************************************/

class SVGDB {
    constructor() {
        this.db = new Dexie(DB_NAME);

        this.db.version(DB_VERSION).stores({
            coronal: "idx,svg",
            horizontal: "idx,svg",
            sagittal: "idx,svg",
            // extra: "idx,svg",
            features: "feature,data,statistics",
        });

        let that = this;
        this.db.open().then(async (ev) => {
            console.debug("opening the database");

            that.coronal = this.db.table("coronal");
            that.horizontal = this.db.table("horizontal");
            that.sagittal = this.db.table("sagittal");
            that.features = this.db.table("features");


            // Fill the database with the features data.
            let count = await that.features.count();
            if (count == 0) {
                splash.start();

                // 10%
                splash.set(10);

                console.log("loading the features...");

                let features = await downloadFeatures();

                // 20%
                splash.set(20);

                // Put the feature data in the database.
                await that.features.bulkPut(features);

                // 30%
                splash.set(30);

                console.log(`successfully loaded the features!`);
            }

            // Fill the database with the SVG data.
            count = await that.coronal.count();
            if (count == 0) {
                console.log("loading the SVG data...");

                // Download the SVG slices.
                let slices = await downloadSlices();

                // 40%
                splash.set(40);

                // Put the SVG data in the database.
                await that.coronal.bulkPut(slices['coronal']);

                // 60%
                splash.set(60);

                console.debug('done loading coronal slices');

                await that.horizontal.bulkPut(slices['horizontal']);

                // 80%
                splash.set(80);

                console.debug('done loading horizontal slices');

                await that.sagittal.bulkPut(slices['sagittal']);
                console.debug('done loading sagittal slices');

                console.log("successfully loaded SVG data!");
            }

            // 100%
            splash.set(100);

        });
    }

    getSlice(axis, idx) {
        this[axis].get(idx).then((item) => {
            if (item) {
                let svg = item["svg"];
                document.getElementById(`figure-${axis}`).innerHTML = svg;
            }
        });
    }

    async getFeature(feature, region_idx) {
        if (!this.features) return null;
        let item = await this.features.get(feature);
        return item["data"][region_idx];
    }

    async getFeatureStat(feature, stat) {
        if (!this.features) return null;
        let item = await this.features.get(feature);
        return item["statistics"][stat];
    }
}
