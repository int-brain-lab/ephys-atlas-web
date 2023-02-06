
/*************************************************************************************************/
/* Constants                                                                                     */
/*************************************************************************************************/

const DB_NAME = "IBLEphysAtlasDatabase";


/*************************************************************************************************/
/* SVG slices                                                                                    */
/*************************************************************************************************/

async function downloadSlices() {
    console.log("downloading the SVG data...");

    var url = `/data/slices.json`;
    var r = await fetch(url);
    var slices = await r.json();
    return slices;
}



function deleteDatabase() {
    console.log("deleting the database");
    Dexie.delete(DB_NAME);
}



async function createDatabase() {
    var db = new Dexie(DB_NAME);

    db.version(1).stores({
        coronal: "idx,svg",
    });

    // Now add some values.
    slices = await downloadSlices();

    // let items = [];
    // for (const [key, value] of Object.entries(slices["coronal"])) {
    //     items.push({ idx: parseInt(key, 10), svg: value });
    // }
    // console.log(items);
    db.coronal.bulkPut(slices["coronal"]).then(ev => {
        console.log("successfully filled the database with the SVG slices");
    }).catch(err => {
        console.error("error:", err);
    });

}



function openDatabase(idx) {
    var db = new Dexie(DB_NAME);
    db.open().then((ev) => {
        let table = db.table("coronal");
        table.get(idx).then((item) => {
            let svg = item["svg"];
            document.getElementById("figure_1").innerHTML = svg;
        });
    }).catch((err) => {
        console.error('failed to open db:', (err.stack || err));
    });
}



/*************************************************************************************************/
/* Entry-point                                                                                   */
/*************************************************************************************************/

window.onload = async (ev) => {
    console.log("page loaded");
    // deleteDatabase();
    // createDatabase();
    // openDatabase(idx);

    document.getElementById("slice-range").oninput = (ev) => {
        let idx = Math.floor(ev.target.value);
        console.log(idx);
        openDatabase(idx);
    };
};
