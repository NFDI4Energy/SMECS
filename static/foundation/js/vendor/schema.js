// src/schema.js
// JSON-Schema loading and mandatory field handling

export const JsonSchemaUrl = '/static/schema/codemeta_schema.json';

// /**
//  * Fetch required and recommended fields from JSON schema.
//  * @returns {Promise<{required: string[], recommended: string[]}>}
//  */
export async function fetchRequiredAndRecommendedFields() {
    const response = await fetch(JsonSchemaUrl);
    const schema = await response.json();
    return {
        required: schema.required || [],
        recommended: schema.recommended || []
    };
}

/**
 * Dynamically mark schema-required fields with 'required' attribute and a red asterisk.
 */
export async function setMandatoryFieldsFromSchema() {
    const { required } = await fetchRequiredAndRecommendedFields();
    const inputs = document.querySelectorAll("#metadata-form input, #metadata-form select");

    required.forEach(fieldKey => {
        inputs.forEach(input => {
            if (input.name === fieldKey || input.id === fieldKey) {
                input.setAttribute('required', '');
            }
        });

        const hiddenInput = document.getElementById(fieldKey + 'HiddenInput');
        if (hiddenInput) {
            hiddenInput.setAttribute('required', '');
        }

        let label = document.querySelector(`label[for="${fieldKey}"]`);
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
}

// /**
//  * Validate that all required fields in formData JSON string are populated.
//  * @param {string} formData
//  * @returns {Promise<boolean>}
//  */
export function validateMandatoryFields(formData) {
    return new Promise((resolve, reject) => {
        fetch(JsonSchemaUrl)
            .then(res => res.json())
            .then(schema => {
                const required = schema.required || [];
                let parsed;
                try {
                    parsed = JSON.parse(formData);
                } catch {
                    return reject('Invalid JSON');
                }
                const ok = required.every(f => parsed[f] && parsed[f].toString().trim() !== '');
                resolve(ok);
            })
            .catch(err => reject(err));
    });
}