
class Unity {
  constructor() {
    console.debug("setup Unity");
    createUnityInstance(document.getElementById("unity-canvas"), {
        dataUrl: "Build/webgl.data.gz",
        frameworkUrl: "Build/webgl.framework.js.gz",
        codeUrl: "Build/webgl.wasm.gz",
        companyName: "Daniel Birman @ UW",
        productName: "ephys_atlas",
        productVersion: "0.1.0",
    }).then((unityInstance) => {
        window.unity = unityInstance;
    });
  }
  
 setUnityRegions(regions) {
  // for (const [idx, acronym] of Object.entries(regions)) {
  //     let p = document.querySelector(`path.region_${idx}`);
  //     if (!p) continue;
  //     let color = window.getComputedStyle(p).fill;
  //     let hexcode = rgb2hex(color);
  //     // console.log(acronym, hexcode);
  //     window.unity.SendMessage('main', 'SetColor', `${acronym}:${hexcode}`);
  // }
  }
}

