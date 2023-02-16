
function setupUnity() {
    createUnityInstance(document.getElementById("unity-div"), {
        dataUrl: "data/webgl.data",
        frameworkUrl: "data/webgl.framework.js",
        codeUrl: "data/webgl.wasm",
        companyName: "Daniel Birman @ UW",
        productName: "ephys_atlas",
        productVersion: "0.1.0",
    }).then((unityInstance) => {
        window.unity = unityInstance;
    });
}
