export { Unity };

class Unity {
  constructor() {
    console.debug("setup Unity");
    createUnityInstance(document.getElementById("unity-canvas"), {
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
  
 setColor() {
  // example code demonstrating usage - I'm using acronyms here but we could replace w/ atlas ID numbers if that's easier
    window.unity.SendMessage('main', 'SetColor', 'VISpl:FFFFFF');
    window.unity.SendMessage('main', 'SetColor', 'VISpm:FFFFFF');
    window.unity.SendMessage('main', 'SetColor', 'VISpor:FFFFFF');
}

  setVisibility() {
    // example code
    window.unity.SendMessage('main', 'SetVisibility', 'VISp:false');
  }

  loadedCallback() {
    // run example code
    this.setColor();
    this.setVisibility();
  }
}

