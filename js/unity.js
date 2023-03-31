export { Unity };

class Unity {
  constructor() {
    console.debug("setup Unity");
    createUnityInstance(document.getElementById("unity-canvas"), {
        dataUrl: "Build/webgl.data.unityweb",
        frameworkUrl: "Build/webgl.framework.js.unityweb",
        codeUrl: "Build/webgl.wasm.unityweb",
        companyName: "Daniel Birman @ UW",
        productName: "ephys_atlas",
        productVersion: "0.1.0",
    }).then((unityInstance) => {
        window.unity = unityInstance;

        // run example code
        this.setColor();
        this.setVisibility();
    });
  }
  
 setColor(regions) {
  // example code demonstrating usage - I'm using acronyms here but we could replace w/ atlas ID numbers if that's easier
    window.unity.SendMessage('main', 'VISpl', 'VISp:FFFFFF');
    window.unity.SendMessage('main', 'VISpm', 'VISp:FFFFFF');
    window.unity.SendMessage('main', 'VISpor', 'VISp:FFFFFF');
}

  setVisibility(selected) {
    // example code
    window.unity.SendMessage('main', 'SetVisibility', 'VISp:false');
  }
}

