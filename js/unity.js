
function setupUnity() {
    console.debug("setup Unity");
    createUnityInstance(document.getElementById("unity-div"), {
        dataUrl: "Build/webgl.data",
        frameworkUrl: "Build/webgl.framework.js",
        codeUrl: "Build/webgl.wasm",
        companyName: "Daniel Birman @ UW",
        productName: "ephys_atlas",
        productVersion: "0.1.0",
    }).then((unityInstance) => {
        window.unity = unityInstance;
    });
}
