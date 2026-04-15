export function cloneSvgAndSetFillColors(svgElement, getComputedStyleFn = window.getComputedStyle) {
    const originalPathElements = svgElement.querySelectorAll('path');
    const fillColors = new Map();

    originalPathElements.forEach((pathElement) => {
        const fillColor = getComputedStyleFn(pathElement).fill;
        fillColors.set(pathElement, fillColor);
    });

    const clonedSvg = svgElement.cloneNode(true);
    const clonedPathElements = clonedSvg.querySelectorAll('path');

    clonedPathElements.forEach((clonedPathElement, index) => {
        const originalPathElement = originalPathElements[index];
        const fillColor = fillColors.get(originalPathElement);
        clonedPathElement.style.fill = fillColor;
    });

    return clonedSvg;
}

export async function exportSvgCollection({
    svgs,
    zipFactory = () => new JSZip(),
    serializerFactory = () => new XMLSerializer(),
    documentRoot = document,
    imageFactory = () => new Image(),
    createObjectUrl = (blob) => URL.createObjectURL(blob),
    revokeObjectUrl = (url) => URL.revokeObjectURL(url),
    saveBlob = (blob, filename) => saveAs(blob, filename),
    getComputedStyleFn = window.getComputedStyle,
}) {
    const zip = zipFactory();

    for (const svg of svgs) {
        const svgClone = cloneSvgAndSetFillColors(svg, getComputedStyleFn);
        const svgData = serializerFactory().serializeToString(svgClone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = createObjectUrl(svgBlob);

        const canvas = documentRoot.createElement('canvas');
        const context = canvas.getContext('2d');
        const img = imageFactory();

        await new Promise((resolve) => {
            img.onload = () => {
                canvas.width = 10 * img.width;
                canvas.height = 10 * img.height;
                context.drawImage(img, 0, 0);
                revokeObjectUrl(url);
                resolve();
            };
            img.src = url;
        });

        const pngBlob = await new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        });

        const id = svg.getAttribute('id') || `svg-${Math.random().toString(36).substr(2, 9)}`;
        zip.file(`${id}.png`, pngBlob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveBlob(zipBlob, 'svgs.zip');
    return zipBlob;
}
