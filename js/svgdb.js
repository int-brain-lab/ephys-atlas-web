
/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const DB_NAME = "IBLEphysAtlasDatabase";
const DB_VERSION = 1;



/*************************************************************************************************/
/* Utils                                                                                         */
/*************************************************************************************************/

function getOS() {
    var userAgent = window.navigator.userAgent,
        platform = window.navigator?.userAgentData?.platform || window.navigator.platform,
        macosPlatforms = ['macOS', 'Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
        windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
        iosPlatforms = ['iPhone', 'iPad', 'iPod'],
        os = null;

    if (macosPlatforms.indexOf(platform) !== -1) {
        os = 'macOS';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
        os = 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
        os = 'Windows';
    } else if (/Android/.test(userAgent)) {
        os = 'Android';
    } else if (/Linux/.test(platform)) {
        os = 'Linux';
    }

    return os;
}



async function downloadJSON(url) {
    console.log(`downloading ${url}...`);
    var r = await fetch(url);
    var out = await r.json();
    console.log("download finished");
    return out;
}



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



function insertSlices(store, slices, axis) {
    // Put the SVG data in the database.
    store.bulkPut(slices[axis]).then(ev => {
        console.log(`successfully filled the '${axis}' store with the SVG slices`);
    }).catch(err => {
        console.error("error:", err);
    });
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
        this.db.open().then((ev) => {
            console.log("opening the database");

            that.coronal = this.db.table("coronal");
            that.horizontal = this.db.table("horizontal");
            that.sagittal = this.db.table("sagittal");
            that.features = this.db.table("features");


            // Fill the database with the SVG data.
            that.coronal.count().then(async (res) => {
                if (res == 0) {
                    console.log("filling the database with the SVG data...");

                    // Download the SVG slices.
                    let slices = await downloadSlices();

                    // Put the SVG data in the database.
                    insertSlices(that.coronal, slices, "coronal");
                    insertSlices(that.horizontal, slices, "horizontal");
                    insertSlices(that.sagittal, slices, "sagittal");

                    console.log("successfully loaded slides");

                }
            }).catch((err) => {
                console.error('failed to open db:', (err.stack || err));
            });


            // Fill the database with the features data.
            that.features.count().then((res) => {
                if (res == 0) {
                    console.log("filling the database with the features...");

                    downloadFeatures().then((features) => {
                        // Put the feature data in the database.
                        that.features.bulkPut(features).then(ev => {
                            console.log(`successfully filled the features store`);
                        }).catch(err => {
                            console.error("error:", err);
                        });
                    });
                }
            });
        }).catch((err) => {
            console.error('failed to open db:', (err.stack || err));
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
