// schema-utils.js
const JsonSchema = '/static/schema/codemeta_schema.json';
const inputs = document.querySelectorAll("#metadata-form input, #metadata-form select");
let schemaCache = null;
let schemaPromise = null;

export function getSchema() {
if (schemaCache) return Promise.resolve(schemaCache);
if (schemaPromise) return schemaPromise;

schemaPromise = fetch(JsonSchema)
    .then(response => response.json())
    .then(schema => {
        schemaCache = schema;
        return schemaCache;
    });

return schemaPromise;
}

// Helper: Fetch required and recommended fields from schema
export function fetchRequiredAndRecommendedFields(schema) {
    // Required fields: standard JSON Schema
    const required = schema.required || [];
    // Recommended fields: codemeta uses "recommended" (array) or similar
    const recommended = schema.recommended || [];
    return { required, recommended };
}

// Helper to get nested property keys for a specific type
export function getNestedExpectedKeys(schema, typeName) {
    // For JSON Schema Draft-07 and later, use $defs; for older, use definitions
    const defs = schema.$defs || schema.definitions || {};
    const typeDef = defs[typeName];
    if (!typeDef || !typeDef.properties) {
        return [];
    }
    // Exclude @type if you want
    return Object.keys(typeDef.properties).filter(key => key !== "@type");
}

// Compare allowed/required JSON keys with actual JSON object keys
export function matchKeys(allowedKeys, requiredKeys, jsonKeys) {
    // Ensure "@type" is always allowed
    if (!allowedKeys.includes("@type")) {
        allowedKeys = allowedKeys.concat("@type");
    }
    const lowerAllowedKeys = allowedKeys.map(key => key.toLowerCase());
    const lowerRequiredKeys = requiredKeys.map(key => key.toLowerCase());
    const lowerJsonKeys = jsonKeys.map(key => key.toLowerCase());

    const missingKeys = lowerRequiredKeys.filter(key => !lowerJsonKeys.includes(key));
    const extraKeys = lowerJsonKeys.filter(key => !lowerAllowedKeys.includes(key));

    return { missingKeys, extraKeys };
}

// Recursive key comparison including nested objects and arrays
export function keysMatchRecursive(allowedKeys, requiredKeys, jsonObject, schema) {
    const jsonKeys = Object.keys(jsonObject);
    const { missingKeys, extraKeys } = matchKeys(allowedKeys, requiredKeys, jsonKeys);

    let nestedErrors = [];

    for (const key of jsonKeys) {
        const value = jsonObject[key];
        if (Array.isArray(value)) {
            value.forEach((item, idx) => {
                if (item && typeof item === "object") {
                    const typeName = item["@type"] || key;
                    const expectedKeys = getNestedExpectedKeys(schema, typeName);
                    const requiredNested = []; // Optionally, get required keys for this type from schema
                    const result = keysMatchRecursive(expectedKeys, requiredNested, item, schema);
                    if (!result.isMatch) {
                        nestedErrors.push(
                            `In ${key}[${idx}] with ${typeName}: Missing Keys: ${result.missingKeys.join(", ")}, Extra Keys: ${result.extraKeys.join(", ")}`
                        );
                        if (result.nestedErrors.length > 0) {
                            nestedErrors = nestedErrors.concat(result.nestedErrors);
                        }
                    }
                }
            });
        } else if (value && typeof value === "object") {
            const typeName = value["@type"] || key;
            const expectedKeys = getNestedExpectedKeys(schema, typeName);
            const requiredNested = [];
            const result = keysMatchRecursive(expectedKeys, requiredNested, value, schema);
            if (!result.isMatch) {
                nestedErrors.push(
                    `In ${key}: Missing Keys: ${result.missingKeys.join(", ")}, Extra Keys: ${result.extraKeys.join(", ")}`
                );
                if (result.nestedErrors.length > 0) {
                    nestedErrors = nestedErrors.concat(result.nestedErrors);
                }
            }
        }
    }

    return {
        isMatch: missingKeys.length === 0 && extraKeys.length === 0 && nestedErrors.length === 0,
        missingKeys,
        extraKeys,
        nestedErrors
    };
}

// Function to dynamically mark mandatory fields based on required key in JSON schema
export function setMandatoryFieldsFromSchema() {
    getSchema().then(schema => {
            const { required, recommended } = fetchRequiredAndRecommendedFields(schema);

            required.forEach(function (fieldKey) {
                // Find all inputs where the name matches the required field

                inputs.forEach(function (input) {
                    // 1. Standard input/select fields
                    const standardInputs = document.querySelectorAll(`[name="${fieldKey}"]`);
                    standardInputs.forEach(function (input) {
                        input.setAttribute('required', true);
                    });

                    // 2. Tagging fields (hidden input for tagging/tagging_autocomplete)
                    const hiddenInput = document.getElementById(fieldKey + 'HiddenInput');
                    if (hiddenInput) {
                        hiddenInput.setAttribute('required', true);
                    }

                    // 3. Add asterisk to the correct label
                    // Try standard label first
                    let label = document.querySelector(`label[for="${fieldKey}"]`);
                    // If not found, try tagging label
                    if (!label) {
                        label = document.querySelector(`.tagging-label[for="${fieldKey}Input"]`);
                    }
                    if (label && !label.innerHTML.includes('*')) {
                        const asterisk = document.createElement('span');
                        asterisk.style.color = 'red';
                        asterisk.style.fontSize = '18px';
                        asterisk.textContent = '*';
                        label.appendChild(document.createTextNode(' '));
                        label.appendChild(asterisk);
                    }
                });
            });
        })
        .catch(error => {
            console.error('Error loading the JSON schema:', error);
        });
}