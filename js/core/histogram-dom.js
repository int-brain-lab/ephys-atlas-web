import { clamp } from "../utils.js";

export function drawHistogram(container, counts, cmin, cmax, cmap, denominator) {
    if (!container || !counts) return;
    console.assert(cmap);

    const n = counts.length;
    const colorCount = cmap.length;
    const safeDenominator = denominator > 0 ? denominator : Math.max(1, ...counts);

    let child = null;
    if (container.children.length === 0) {
        for (let i = 0; i < n; i++) {
            child = document.createElement('div');
            child.classList.add(`bar-${i}`);
            container.appendChild(child);
        }
    }

    for (let i = 0; i < n; i++) {
        child = container.children[i];
        let x = i * 100.0 / n;
        x = (x - cmin) / (cmax - cmin);
        x = clamp(x, 0, 0.9999);
        child.style.backgroundColor = cmap[Math.floor(x * colorCount)];
        child.style.height = `calc(10px + ${counts[i] * 100.0 / safeDenominator}%)`;
    }
}
