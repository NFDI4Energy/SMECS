// src/utils.js
// Utility functions: key extraction

// /**
//  * Get field key for an input element, stripping array notation and hidden suffix.
//  * @param {HTMLInputElement|HTMLSelectElement} input
//  * @returns {string}
// */
export function getFieldKey(input) {
    let key = input.name || input.id || "";
    if (key.includes("[")) {
        key = key.split("[")[0];
    }
    if (key.endsWith("HiddenInput")) {
        key = key.replace(/HiddenInput$/, "");
    }
    return key;
}
