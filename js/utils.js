
/*************************************************************************************************/
/* Math                                                                                          */
/*************************************************************************************************/

function clamp(x, min, max) {
    return Math.min(max, Math.max(min, x));
}



function displayNumber(x) {
    return Math.abs(x) < .001 ? x.toExponential(5) : x.toPrecision(5);
}



function rgb2hex(s) {
    var a = s.split("(")[1].split(")")[0];
    a = a.split(",");
    var b = a.map(function (x) {             //For each array element
        x = parseInt(x).toString(16);      //Convert to a base16 string
        return (x.length == 1) ? "0" + x : x;  //Add zero if we get only one character
    });
    b = "#" + b.join("");
    return b;
}




/*************************************************************************************************/
/* UI                                                                                            */
/*************************************************************************************************/

function throttle(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function () {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
    };
    return function () {
        var now = Date.now();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };
};



/*************************************************************************************************/
/* DOM                                                                                           */
/*************************************************************************************************/

function getSlider(axis) {
    return document.getElementById(`slider-${axis}`);
}



function getSVG(axis) {
    return document.getElementById(`figure-${axis}`);
};



function getBarPlot() {
    return document.getElementById('bar-plot');
};



function getRegionID(obj) {
    return obj.classList[0].substr(7);
};



function getFeatureDropdown() {
    return document.getElementById('feature-dropdown');
};




function getFeatureSetDropdown() {
    return document.getElementById('feature-set-dropdown');
};



function getColormapDropdown() {
    return document.getElementById('colormap-dropdown');
};



function getStatDropdown() {
    return document.getElementById('stat-dropdown');
};



function setOptions(select, values) {
    for (let a in select.options) { select.options.remove(0); }
    for (let val of values) {
        let opt = document.createElement('option');
        opt.text = val;
        opt.value = val;
        select.add(opt);
    }
}



/*************************************************************************************************/
/* CSS                                                                                           */
/*************************************************************************************************/

function clearStyle(style) {
    let n = style.cssRules.length;

    for (let i = 0; i < n; i++) {
        style.deleteRule(0);
    }
};



/*************************************************************************************************/
/* Browser                                                                                       */
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
    console.debug(`downloading ${url}...`);
    var r = await fetch(url, {
        headers: {
            'Content-Encoding': 'gzip',
            'Content-Type': 'application/json'
        }
    });
    var out = await r.json();
    console.debug("download finished");
    return out;
}




/*************************************************************************************************/
/* Control panel                                                                                 */
/*************************************************************************************************/

function setupControlButtons() {
    let resetButton = document.getElementById('reset-button');
    resetButton.addEventListener('click', (e) => {
        if (window.confirm("Are you sure you want to delete the cache and re-download the data?")) {
            deleteDatabase();
            location.reload();
        }
    });
}
