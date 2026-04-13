export function getRequiredElement(id, root = document) {
    const element = root.getElementById ? root.getElementById(id) : root.querySelector(`#${id}`);
    if (!element) {
        throw new Error(`Missing required DOM element #${id}`);
    }
    return element;
}

export function getRequiredSelector(selector, root = document) {
    const element = root.querySelector(selector);
    if (!element) {
        throw new Error(`Missing required DOM element matching ${selector}`);
    }
    return element;
}

export function getRequiredSheet(id, root = document) {
    const styleElement = getRequiredElement(id, root);
    if (!styleElement.sheet) {
        throw new Error(`Missing stylesheet sheet for #${id}`);
    }
    return styleElement.sheet;
}
