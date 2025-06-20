// form-utils.js

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

export function validateInput(input) {
  const skipValidationIds = [
    'contributorGivenNameInput', 'contributorFamilyNameInput', 'contributorEmailInput',
    'authorGivenNameInput', 'authorFamilyNameInput', 'authorEmailInput'
  ];
  if (skipValidationIds.includes(input.id)) return;
  getSchema().then(schema => {
      const { required, recommended } = fetchRequiredAndRecommendedFields(schema);
      const allMandatory = [...required, ...recommended];

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
    .catch(() => input.classList.remove("invalid"));
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
