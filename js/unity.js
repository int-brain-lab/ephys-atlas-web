
function setupUnity() {
    console.debug("setup Unity");
    createUnityInstance(document.getElementById("unity-div"), {
        dataUrl: "data/unity/webgl.data.gz",
        frameworkUrl: "data/unity/webgl.framework.js.gz",
        codeUrl: "data/unity/webgl.wasm.gz",
        companyName: "Daniel Birman @ UW",
        productName: "ephys_atlas",
        productVersion: "0.1.0",
    }).then((unityInstance) => {
        window.unity = unityInstance;
    });
}
