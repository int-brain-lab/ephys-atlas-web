/*************************************************************************************************/
/* Math                                                                                          */
/*************************************************************************************************/

const DISPLAY_NUMBER_PRECISION = 6;



export function clamp(x, min, max) {
    return Math.min(max, Math.max(min, x));
}



export function displayNumber(x) {
    if (x == 0) return '0';
    else if (!x) return 'not significant';
    else return (Math.abs(x) < .001 ?
        x.toExponential(DISPLAY_NUMBER_PRECISION) :
        x.toPrecision(DISPLAY_NUMBER_PRECISION));
}



export function rgb2hex(s) {
    // var a = s.split("(")[1].split(")")[0];
    // a = a.split(",");
    // var b = a.map(function (x) {             //For each array element
    //     x = parseInt(x).toString(16);      //Convert to a base16 string
    //     return (x.length == 1) ? "0" + x : x;  //Add zero if we get only one character
    // });
    // b = "#" + b.join("");
    // return b;
    let rgb = s.split(',');

    let r = parseInt(rgb[0]);
    let g = parseInt(rgb[1]);
    let b = parseInt(rgb[2]);

    r = r.toString(16).padStart(2, '0');
    g = g.toString(16).padStart(2, '0');
    b = b.toString(16).padStart(2, '0');

    let hex = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
    return hex;
}



export function normalizeValue(value, vmin, vmax) {
    if (value == undefined || isNaN(value)) return value;
    if (vmin == undefined || isNaN(vmin)) vmin = value;
    if (vmax == undefined || isNaN(vmax)) vmax = value;

    console.assert(!isNaN(value));
    console.assert(value !== undefined);

    if (vmin >= vmax) return 100;
    console.assert(vmin <= vmax);

    value = clamp(value, vmin, vmax);

    let d = vmin < vmax ? vmax - vmin : 1;
    let normalized = Math.floor(100 * (value - vmin) / d);
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



// export function cached(download) {
//     const cache = new Map();
//     return async function (...id) {
//         const idString = JSON.stringify(id);
//         if (cache.has(idString)) {
//             return cache.get(idString);
//         }
//         const downloadPromise = download(...id).then((result) => {
//             cache.set(idString, result);
//             return result;
//         });
//         cache.set(idString, downloadPromise);
//         return await downloadPromise;
//     };
// }



/*************************************************************************************************/
/* DOM                                                                                           */
/*************************************************************************************************/

export function addOption(select, text, value, selected) {
    let opt = document.createElement('option');
    opt.text = text;
    opt.value = value;
    opt.selected = selected;
    select.add(opt);
}

export function removeOption(select, value) {
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) {
            select.remove(i);
            break;
        }
    }
}

export function setOptions(select, values, selected) {
    for (let _ in select.options) { select.options.remove(0); }
    for (let val of values) {
        addOption(select, val, val, val == selected);
    }
}



export function removeClassChildren(element, tagName, className) {
    if (element.tagName === tagName) {
        element.classList.remove(className);
    }

    const children = element.children;
    for (let i = 0; i < children.length; i++) {
        removeClassChildren(children[i], tagName, className);
    }
}



export function removeFromArray(array, toRemove) {
    return array.filter(item => item !== toRemove);
}



export function setBackgroundImage(el, url) {
    var tempImage = new Image();
    tempImage.src = url;
    tempImage.onload = function () {
        el.style.backgroundImage = `url("${url}")`;
    };
}


// export function getBarPlot() {
//     return document.getElementById('bar-plot');
// };



export function getRegionIdx(mapping, obj) {
    let r = /\d+/;
    let mapping_ = mapping + "_";
    // Find the class name corresponding to the mapping.
    for (let className of obj.classList) {
        if (className.includes(mapping_)) {
            return parseInt(className.match(r)[0]);
        }
    }
};



export function e2idx(mapping, e) {
    console.assert(mapping);
    console.assert(e);

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
/* Functional                                                                                    */
/*************************************************************************************************/

export function memoize(fn) {
    let cache = {};
    return (...args) => {
        let key = JSON.stringify(args);
        if (key in cache) return cache[key];
        else return cache[key] = fn(...args);
    };
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



export async function downloadJSON(url, refresh = false) {
    console.debug(`downloading ${url}... (refresh is ${refresh})`);
    let params = {
        headers: {
            'Content-Encoding': 'gzip',
            'Content-Type': 'application/json'
        },
    };
    if (refresh)
        params['cache'] = 'reload';
    var r = await fetch(url, params);
    if (!r.ok) {
        console.error(`could not load ${url}:`);
        return null;
    }
    if (r.status == 200) {
        var out = await r.json();
        return out;
    }
    return null;
}



export function downloadBinaryFile(url, filename) {
    // Create a hidden anchor element
    const anchor = document.createElement('a');
    anchor.style.display = 'none';

    // Set the URL of the file to download
    anchor.href = url;

    // Set the 'download' attribute with the desired file name
    anchor.download = filename;

    // Append the anchor element to the document
    document.body.appendChild(anchor);

    // Simulate a click on the anchor element to start the download
    anchor.click();

    // Clean up: remove the anchor element
    document.body.removeChild(anchor);
}
