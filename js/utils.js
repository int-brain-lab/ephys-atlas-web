/*************************************************************************************************/
/* Math                                                                                          */
/*************************************************************************************************/

export function clamp(x, min, max) {
    return Math.min(max, Math.max(min, x));
}



export function displayNumber(x) {
    if (!x) return '0';
    return Math.abs(x) < .001 ? x.toExponential(5) : x.toPrecision(5);
}



export function rgb2hex(s) {
    var a = s.split("(")[1].split(")")[0];
    a = a.split(",");
    var b = a.map(function (x) {             //For each array element
        x = parseInt(x).toString(16);      //Convert to a base16 string
        return (x.length == 1) ? "0" + x : x;  //Add zero if we get only one character
    });
    b = "#" + b.join("");
    return b;
}



export function normalizeValue(value, vmin, vmax) {
    if (value == NaN || value == undefined) return value;

    console.assert(value !== NaN);
    console.assert(value !== undefined);

    if (vmin >= vmax) return vmin;
    console.assert(vmin < vmax);

    value = clamp(value, vmin, vmax);

    let normalized = Math.floor(100 * (value - vmin) / (vmax - vmin));
    console.assert(normalized >= 0);
    console.assert(normalized <= 100);

    return normalized;
}



/*************************************************************************************************/
/* UI                                                                                            */
/*************************************************************************************************/

export function throttle(func, wait, options) {
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

export function setOptions(select, values, selected) {
    for (let _ in select.options) { select.options.remove(0); }
    for (let val of values) {
        let opt = document.createElement('option');
        opt.text = val;
        opt.value = val;
        if (val == selected) {
            opt.selected = true;
        }
        select.add(opt);
    }
}



// export function getBarPlot() {
//     return document.getElementById('bar-plot');
// };



export function getRegionIdx(mapping, obj) {
    let r = /\d+/;
    // Find the class name corresponding to the mapping.
    for (let className of obj.classList) {
        if (className.includes(mapping)) {
            return parseInt(className.match(r)[0]);
        }
    }
};



export function e2idx(mapping, e) {
    return getRegionIdx(mapping, e.target);
}



/*************************************************************************************************/
/* CSS                                                                                           */
/*************************************************************************************************/

export function clearStyle(style) {
    let n = style.cssRules.length;

    for (let i = 0; i < n; i++) {
        style.deleteRule(0);
    }
};



/*************************************************************************************************/
/* Serialization                                                                                 */
/*************************************************************************************************/

export function encode(obj) {
    if (!obj) return '';
    return btoa(JSON.stringify(obj));
}



export function decode(encoded) {
    if (!encoded) return {};
    return JSON.parse(atob(encoded));
}



/*************************************************************************************************/
/* Browser                                                                                       */
/*************************************************************************************************/

export function getOS() {
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



export async function downloadJSON(url) {
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
