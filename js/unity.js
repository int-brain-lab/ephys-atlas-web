
function setupUnity() {
    return;
    createUnityInstance(document.getElementById("unity-div"), {
        dataUrl: "data/webgl.data.gz",
        frameworkUrl: "data/webgl.framework.js.gz",
        codeUrl: "data/webgl.wasm.gz",
        companyName: "Daniel Birman @ UW",
        productName: "ephys_atlas",
        productVersion: "0.1.0",
    }).then((unityInstance) => {
        window.unity = unityInstance;
    });
}
