// download.js

/*Validates metadata structure before download
Cleans out empty fields
Formats and downloads the JSON as a codemeta.json file
*/

import { keysMatchRecursive } from './schema-utils.js';

const JsonSchema = '/static/schema/codemeta_schema.json';
const metadataJson = document.getElementById("metadata-json");
const downloadButton = document.getElementById("downloadButton");
const downloadBtn = document.getElementById("downloadBtn");

// Function to trigger file download from JSON textarea
export function setupDownload() {
    downloadButton.addEventListener("click", (event) => {
        downloadFile(event);
    });
    downloadBtn.addEventListener("click", (event) => {
        downloadFile(event);
    });
}

// Function to handle download with validation
function downloadFile(event) {
    event.preventDefault();

    try {
        const data = metadataJson.value;
        const entered_metadata = JSON.parse(data); // Move inside try block
        const metadata = getCleanedMetadata(entered_metadata);
        const jsonKeys = Object.keys(metadata); // Extract keys from received JSON

        let repoName = "metadata"; // Default name

        fetch(JsonSchema)
            .then(response => response.json())
            .then(schema => {
                // Extract all property keys
                const allowedKeys = Object.keys(schema.properties || {});
                const requiredKeys = schema.required || [];

                // Get key comparison result
                const keyCheck = keysMatchRecursive(allowedKeys, requiredKeys, metadata, schema);

                if (!keyCheck.isMatch) {
                    let errorMessage = "";
                    if (keyCheck.missingKeys.length > 0) {
                        errorMessage += `Not all required elements were filled. Please add content to the following elements:\n\n ${keyCheck.missingKeys.join(", ")}\n`;
                    }
                    if (keyCheck.extraKeys.length > 0) {
                        errorMessage += `There are elements which are not part of the standard. Please remove the following elements:\n\n: ${keyCheck.extraKeys.join(", ")}\n`;
                    }
                    if (keyCheck.nestedErrors.length > 0) {
                        errorMessage += `\nNested Errors:\n${keyCheck.nestedErrors.join("\n")}`;
                    }
                    alert(errorMessage);
                } else {
                    jsonPrettier(repoName, metadata);
                }
            })
            .catch(error => {
                console.error('Error loading schema:', error);
            });
    }
    catch (e) {
        let errorMessage = `\n\nCurrent Metadata:\n${JSON.stringify(metadata, null, 2)}`;
        alert(errorMessage);
        alert("Invalid JSON. Please check your syntax:metadata");
        console.error("JSON Parsing Error:", e);
    }
}

// Provide metadata as download
function jsonPrettier(repoName, metadata) {
    let validJson;
    const values = Object.values(metadata).slice(0, 2);
    // Check the conditions
    if (values[0] !== "https://w3id.org/codemeta/3.0" || values[1] !== "SoftwareSourceCode") {
        // Update the first two keys in the object
        const keys = Object.keys(metadata);
        if (keys.length >= 2) {
            metadata[keys[0]] = "https://w3id.org/codemeta/3.0"; // Update the first key's value
            metadata[keys[1]] = "SoftwareSourceCode"; // Update the second key's value
        }
    }

    if (metadata.name) {
        repoName = metadata.name;            
        validJson = JSON.stringify(metadata, null, 2);
    }
    const fileName = `${repoName}/codemeta.json`;
    const blob = new Blob([validJson], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.innerHTML = "Download JSON";
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        URL.revokeObjectURL(link.href);
        link.parentNode.removeChild(link);
    }, 100);
}

// Function to create a cleaned copy of an object by removing empty entries
function getCleanedMetadata(obj) {
    const cleanedObj = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            // Recursively clean nested objects
            const cleanedNested = getCleanedMetadata(obj[key]);
            if (Object.keys(cleanedNested).length > 0) {
                cleanedObj[key] = cleanedNested;
            }
        } else if (Array.isArray(obj[key])) {
            // Remove empty elements from arrays
            const cleanedArray = obj[key].filter(item => item !== null && item !== undefined && item !== '');
            if (cleanedArray.length > 0) {
                cleanedObj[key] = cleanedArray;
            }
        } else if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
            // Copy non-empty values
            cleanedObj[key] = obj[key];
        }
    });
    return cleanedObj;
}
