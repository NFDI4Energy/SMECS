// dropdown-utils.js
/*Populates <select> elements based on schema-enumerated options:
    Dynamically loads schema values into dropdowns using a DynamicDropdown class
    Automatically initializes all select elements with data-dropdown-schema*/

import { getSchema } from "./schema-utils.js";
const JsonSchema = "/static/schema/codemeta_schema.json";
const dropdownElements = document.querySelectorAll(
  "select[data-dropdown-schema]"
);

// Create a general dropdown class
class DynamicDropdown {
  constructor(dropdownId, jsonSchemaUrl, schemaProperty) {
    this.dropdownId = dropdownId; // The ID of the dropdown element
    this.jsonSchemaUrl = jsonSchemaUrl; // The URL of the JSON schema
    this.schemaProperty = schemaProperty; // The property in the schema to use for options
  }

  populateDropdown() {
    getSchema()
      .then((schema) => {
        const enumValues = schema.properties?.[this.schemaProperty]?.enum || [];
        const dropdown = document.getElementById(this.dropdownId);

        if (!dropdown) {
          console.error(`Dropdown with ID "${this.dropdownId}" not found.`);
          return;
        }

        // Values from imported or pasted metadata are rendered by Django. 
        // Keep that value while replacing the placeholder options below.
        const initialValue = dropdown.dataset.initialValue || "";

        // Clear existing options
        dropdown.innerHTML = "";

        // Add default "Select" option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select an option";
        dropdown.appendChild(defaultOption);

        // Populate dropdown with enum values
        enumValues.forEach((value) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          dropdown.appendChild(option);
        });

        if (initialValue) {
          // Do not drop valid metadata just because an imported value is not
          // in this version of the local schema's enum.
          if (!enumValues.includes(initialValue)) {
            const importedOption = document.createElement("option");
            importedOption.value = initialValue;
            importedOption.textContent = initialValue;
            dropdown.appendChild(importedOption);
          }
          dropdown.value = initialValue;
          // Keep the JSON preview and required-field validation in sync with
          // the value restored after asynchronous dropdown population.
          dropdown.dispatchEvent(new Event("change", { bubbles: true }));
        }
      })
      .catch((error) => {
        console.error(
          `Failed to load schema or populate dropdown for "${this.dropdownId}":`,
          error
        );
      });
  }
}

// Automatically initialize all dropdowns with the data-dropdown-schema attribute
export function initializeDynamicDropdowns() {
  dropdownElements.forEach((dropdown) => {
    const schemaProperty = dropdown.getAttribute("data-dropdown-schema");
    const dropdownId = dropdown.id;

    if (schemaProperty && dropdownId) {
      // Create an instance of DynamicDropdown for each dropdown
      const dynamicDropdown = new DynamicDropdown(
        dropdownId,
        JsonSchema,
        schemaProperty
      );
      dynamicDropdown.populateDropdown();
    } else {
      console.error(
        `Dropdown with ID "${dropdownId}" is missing required attributes.`
      );
    }
  });

}
