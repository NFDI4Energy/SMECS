// form-utils.js
/*Handles all form input behaviors, including:
    1) Real-time validation against the schema
    2) Syncing form fields to the JSON textarea
    3) Filling form fields from existing metadata*/

import { fetchRequiredAndRecommendedFields , getSchema} from './schema-utils.js';

const metadataJson = document.getElementById("metadata-json");
const inputs = document.querySelectorAll("#metadata-form input, #metadata-form select");

export function setupForm() {
  inputs.forEach(input => validateInput(input));

  inputs.forEach(input => {
    input.addEventListener("input", () => handleInputChange(input));
    input.addEventListener("change", () => handleInputChange(input));
  });
}

function handleInputChange(input) {
  validateInput(input);

  const jsonObject = JSON.parse(metadataJson.value);
  const key = input.name.split("[")[0];
  const subkey = input.name.split("[")[1]?.split("]")[0];

  if (!isInTable(input) && !isInAddRowControls(input)) {
    if (subkey) {
      if (!jsonObject[key]) jsonObject[key] = {};
      jsonObject[key][subkey] = input.value;
    } else {
      jsonObject[key] = input.value;
    }
    metadataJson.value = JSON.stringify(jsonObject, null, 2);
  }
}

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

   // Pinkish inputs, when no metadata is extracted
  export function validateInput(input) {
    const skipValidationIds = [
        'contributorGivenNameInput',
        'contributorFamilyNameInput',
        'contributorEmailInput',
        'authorGivenNameInput',
        'authorFamilyNameInput',
        'authorEmailInput'
    ];
    if (skipValidationIds.includes(input.id)) {
        return; // Skip validation for the specified inputs
    }

    // Fetch schema and validate only if field is required or recommended
        getSchema().then(schema => {
            const { required, recommended } = fetchRequiredAndRecommendedFields(schema);
            const allMandatory = [...required, ...recommended];

            // --- Tagging support ---
            // If input is inside a tags-container, validate the hidden input instead
            const tagsContainer = input.closest('.tags-container');
            if (tagsContainer) {
                const taggingWrapper = tagsContainer.closest('.tagging-wrapper');
                if (taggingWrapper) {
                    const hiddenInput = taggingWrapper.querySelector('input[type="hidden"]');
                    const label = taggingWrapper.querySelector('.tagging-label');
                    const taggingType = label ? label.getAttribute('data-tagging-type') : null;
                    const key = getFieldKey(hiddenInput);

                    if (allMandatory.includes(key)) {
                        if (taggingType === "tagging_object") {
                            // Check number of tags in the container
                            if (isTaggingObjectEmpty(tagsContainer)) {
                                input.classList.add("invalid");
                            } else {
                                input.classList.remove("invalid");
                            }
                        } else {
                            // For normal tagging, check hidden input
                            if (hiddenInput.value.trim() === "") {
                                input.classList.add("invalid");
                            } else {
                                input.classList.remove("invalid");
                            }
                        }
                    } else {
                        input.classList.remove("invalid");
                    }
                    return;
                }
            }

            // --- Standard input/select validation ---
            const key = getFieldKey(input);
            if (allMandatory.includes(key)) {
                if (input.value.trim() === "") {
                    input.classList.add("invalid");
                } else {
                    input.classList.remove("invalid");
                }
            } else {
                input.classList.remove("invalid");
            }
        })
        .catch(() => {
            // On schema load error, fallback to no validation
            input.classList.remove("invalid");
        });
}

function isInTable(element) {
  return !!element.closest('table');
}

function isInAddRowControls(element) {
  return !!element.closest('.add-row-controls');
}

export function updateFormFromJson(jsonObject) {
  inputs.forEach(input => {
    const key = input.name.split("[")[0];
    const subkey = input.name.split("[")[1]?.split("]")[0];

    if (subkey) {
      input.value = jsonObject[key]?.[subkey] || "";
    } else {
      input.value = jsonObject[key] || "";
    }
    validateInput(input);
  });
}
