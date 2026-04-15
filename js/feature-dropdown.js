import { buildFeatureDropdownEntries } from "./core/feature-tree.js";

export class FeatureDropdown {
    constructor(el, documentRoot = document) {
        this.el = el;
        this.documentRoot = documentRoot;
    }

    setFeatures(features, tree, volumes) {
        features = features || {};
        volumes = volumes || [];

        const entries = buildFeatureDropdownEntries(tree, features);
        this.el.innerHTML = '';

        const placeholder = this.documentRoot.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a feature';
        this.el.appendChild(placeholder);

        for (const { fname, label } of entries) {
            const option = this.documentRoot.createElement('option');
            option.value = fname;
            option.textContent = label;
            const desc = features[fname] ? features[fname].short_desc : '';
            const unit = features[fname] ? features[fname].unit : '';
            const titleParts = [];
            if (desc) titleParts.push(desc);
            if (unit && unit.trim().toLowerCase() !== 'dimensionless') titleParts.push(`Unit: ${unit}`);
            if (titleParts.length) {
                option.title = titleParts.join('\n');
            }
            this.el.appendChild(option);
        }

        this.el.disabled = entries.length === 0;
    }

    select(fname) {
        if (!fname || !this.hasOption(fname)) {
            this.el.value = '';
        }
        else {
            this.el.value = fname;
        }
    }

    clear() {
        this.el.value = '';
    }

    selected(fname) {
        return this.el.value === fname;
    }

    hasOption(fname) {
        return Array.from(this.el.options).some((option) => option.value === fname);
    }
}
