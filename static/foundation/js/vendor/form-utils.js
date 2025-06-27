// form-utils.js
/*Handles all form input behaviors, including:
    1) Real-time validation against the schema
    2) Syncing form fields to the JSON textarea
    3) Filling form fields from existing metadata*/

import { validateInput} from './ui.js';

const metadataJson = document.getElementById("metadata-json");
const inputs = document.querySelectorAll("#metadata-form input, #metadata-form select");

export function setupForm() {

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
  const excludedInputs = [];

  // Collect all IDs of single input objects
  const singleInputObjectIds = Array.from(document.querySelectorAll('input[data-single-input-object]'))
   .map(input => input.name) // or .id, depending on what you want to exclude by
   .filter(id => id); // Filter out inputs without a name/id

  // Collect all IDs of single input in tables
  const singleInputTableIds = Array.from(document.querySelectorAll('.auto-property-table input, .auto-property-table select, .auto-property-table textarea'))
  excludedInputs.push(...singleInputObjectIds, ...singleInputTableIds);
  const addRowFields = document.querySelectorAll('[data-add-row="true"]');
  const addRowFieldNames = Array.from(addRowFields).map(field => field.name).filter(Boolean);
  excludedInputs.push(...addRowFieldNames);
            
  if (!isInTable(input) && !isInAddRowControls(input)) {
    if (!excludedInputs.includes(input.name)) {
      if (subkey) {
        if (!jsonObject[key]) jsonObject[key] = {}; // make sure key exists
           jsonObject[key][subkey] = input.value;
        } 
        else {
          jsonObject[key] = input.value;
        }
    }

  metadataJson.value = JSON.stringify(jsonObject, null, 2);
 }
}

function isInTable(element) {
  return !!element.closest('table');
}

function isInAddRowControls(element) {
  return !!element.closest('.add-row-controls');
}
