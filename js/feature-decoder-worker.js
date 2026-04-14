importScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/2.0.3/pako.min.js');

function asciiDecode(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function readUint16LE(buffer) {
    const view = new DataView(buffer.buffer);
    let val = view.getUint8(0);
    val |= view.getUint8(1) << 8;
    return val;
}

function utf32ToUnicodeArray(uint8Array, stringLength) {
    const strings = [];
    const totalBytes = uint8Array.length;
    const bytesPerString = stringLength * 4;

    for (let i = 0; i < totalBytes; i += bytesPerString) {
        const stringBytes = uint8Array.slice(i, i + bytesPerString);
        let unicodeString = '';

        for (let j = 0; j < stringBytes.length; j += 4) {
            const codePoint =
                (stringBytes[j + 3] << 24) |
                (stringBytes[j + 2] << 16) |
                (stringBytes[j + 1] << 8) |
                stringBytes[j];
            if (codePoint == 0) break;
            unicodeString += String.fromCodePoint(codePoint);
        }

        strings.push(unicodeString);
    }

    return strings;
}

function loadNPY(buf) {
    const magic = asciiDecode(buf.slice(0, 6));
    if (magic.slice(1, 6) != 'NUMPY') {
        throw new Error('unknown file type');
    }

    const headerLength = readUint16LE(buf.slice(8, 10));
    const headerStr = asciiDecode(buf.slice(10, 10 + headerLength));
    const offsetBytes = 10 + headerLength;
    const info = JSON.parse(
        headerStr
            .toLowerCase()
            .replace('(', '[')
            .replace(/\,*\)\,*/g, ']')
            .replace(/'/g, "\"")
    );

    let data;
    if (info.descr === "|u1") {
        data = new Uint8Array(buf.buffer, offsetBytes);
    } else if (info.descr === "|i1") {
        data = new Int8Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<u2") {
        data = new Uint16Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<i2") {
        data = new Int16Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<u4") {
        data = new Uint32Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<i4") {
        data = new Int32Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<f4") {
        data = new Float32Array(buf.buffer, offsetBytes);
    } else if (info.descr === "<f8") {
        data = new Float64Array(buf.buffer, offsetBytes);
    } else if (info.descr.startsWith("<u")) {
        data = new Uint8Array(buf.buffer, offsetBytes);
        const stringLength = parseInt(info.descr.substring(2));
        data = utf32ToUnicodeArray(data, stringLength);
    } else {
        throw new Error('unknown numeric dtype');
    }

    const startIndex = buf.length - 8;
    const bounds = new Float32Array(buf.buffer, startIndex);

    return {
        shape: info.shape,
        fortran_order: info.fortran_order,
        data: data,
        bounds: bounds,
    };
}

function loadCompressedBase64(base64) {
    const gzippedData = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const inflatedData = pako.inflate(gzippedData);
    const npydata = new Uint8Array(inflatedData);
    return loadNPY(npydata);
}

function decodeVolumes(featureData) {
    for (const name in featureData.volumes) {
        const vol = featureData.volumes[name].volume;
        featureData.volumes[name].volume = loadCompressedBase64(vol);
    }

    if ("xyz" in featureData) {
        featureData.xyz = loadCompressedBase64(featureData.xyz);
    }
    if ("values" in featureData) {
        featureData.values = loadCompressedBase64(featureData.values);
    }
    if ("urls" in featureData) {
        featureData.urls = loadCompressedBase64(featureData.urls);
    }

    return featureData;
}

self.onmessage = (event) => {
    const { id, featureData } = event.data;

    try {
        const decoded = decodeVolumes(featureData);
        self.postMessage({ id, featureData: decoded });
    }
    catch (error) {
        self.postMessage({
            id,
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
