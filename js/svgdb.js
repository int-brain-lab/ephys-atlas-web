
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
        });

        let that = this;
        this.db.open().then(async (ev) => {
            console.debug("opening the database");

            that.coronal = this.db.table("coronal");
            that.horizontal = this.db.table("horizontal");
            that.sagittal = this.db.table("sagittal");

            // Fill the database with the SVG data.
            let count = await that.coronal.count();
            if (count == 0) {
                console.log("loading the SVG data...");

                // Download the SVG slices.
                let slices = await downloadSlices();
                console.debug('done downloading slices');

                // ***** SPLASH *****
                SPLASH.add(30);
                // ***** SPLASH *****

                // Put the SVG data in the database.
                await that.coronal.bulkPut(slices['coronal']);
                console.debug('done loading coronal slices');

                // ***** SPLASH *****
                SPLASH.add(20);
                // ***** SPLASH *****

                await that.horizontal.bulkPut(slices['horizontal']);
                console.debug('done loading horizontal slices');

                // ***** SPLASH *****
                SPLASH.add(20);
                // ***** SPLASH *****

                await that.sagittal.bulkPut(slices['sagittal']);
                console.debug('done loading sagittal slices');

                // ***** SPLASH *****
                SPLASH.add(20);
                // ***** SPLASH *****

                console.log("successfully loaded SVG data!");
            }
            else {
                // ***** SPLASH *****
                SPLASH.add(90);
                // ***** SPLASH *****
            }
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
}
