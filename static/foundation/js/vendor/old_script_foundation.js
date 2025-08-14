// SMECS
// Software Metadata Extraction and Curation Software
// Metadata Editor and Downloader
// This script sets up event listeners on input fields to update changes in the textarea and a download button to download a JSON object containing metadata.
// Possibility of modifying the extracted metadata
// Display of changes made to the metadata in a text area
// Possibility to download the modified metadata as a JSON file

document.addEventListener("DOMContentLoaded", function () {
  const downloadButton = document.getElementById("downloadButton");
  const downloadBtn = document.getElementById("downloadBtn");
  const updateJsonBtn = document.getElementById("updateFormBtn");
  const inputs = document.querySelectorAll(
    "#metadata-form input, #metadata-form select"
  );
  const deleteButtons = document.querySelectorAll('[data-action="delete"]');
  let tabs_ext = document.querySelectorAll(".tab-links_ext a");
  let contents = document.querySelectorAll(".tab-content_ext .tab");
  const urlInputs = document.querySelectorAll(".url-input");
  const copyBtn = document.getElementById("copy-button");
  const SPDX_URL =
    "https://raw.githubusercontent.com/spdx/license-list-data/master/json/licenses.json";
  const JsonSchema = "/static/schema/codemeta_schema.json";
  const metadataJson = document.getElementById("metadata-json");
  const data = metadataJson.value;
  const metadata = JSON.parse(data);
  const repoName = metadata.name;

  let initialJson = metadataJson;
  //----------------------------------------Schema-----------------------------------------------------------//

  function getNestedExpectedKeys(schema, typeName) {
    // For JSON Schema Draft-07 and later, use $defs; for older, use definitions
    const defs = schema.$defs || schema.definitions || {};
    const typeDef = defs[typeName];
    if (!typeDef || !typeDef.properties) {
      return [];
    }
    // Exclude @type if you want
    return Object.keys(typeDef.properties).filter((key) => key !== "@type");
  }

  function matchKeys(allowedKeys, requiredKeys, jsonKeys) {
    // Ensure "@type" is always allowed
    if (!allowedKeys.includes("@type")) {
      allowedKeys = allowedKeys.concat("@type");
    }
    const lowerAllowedKeys = allowedKeys.map((key) => key.toLowerCase());
    const lowerRequiredKeys = requiredKeys.map((key) => key.toLowerCase());
    const lowerJsonKeys = jsonKeys.map((key) => key.toLowerCase());

    const missingKeys = lowerRequiredKeys.filter(
      (key) => !lowerJsonKeys.includes(key)
    );
    const extraKeys = lowerJsonKeys.filter(
      (key) => !lowerAllowedKeys.includes(key)
    );

    return { missingKeys, extraKeys };
  }

  function keysMatchRecursive(allowedKeys, requiredKeys, jsonObject, schema) {
    const jsonKeys = Object.keys(jsonObject);
    const { missingKeys, extraKeys } = matchKeys(
      allowedKeys,
      requiredKeys,
      jsonKeys
    );

    let nestedErrors = [];

    for (const key of jsonKeys) {
      const value = jsonObject[key];
      if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          if (item && typeof item === "object") {
            const typeName = item["@type"] || key;
            const expectedKeys = getNestedExpectedKeys(schema, typeName);
            const requiredNested = []; // Optionally, get required keys for this type from schema
            const result = keysMatchRecursive(
              expectedKeys,
              requiredNested,
              item,
              schema
            );
            if (!result.isMatch) {
              nestedErrors.push(
                `In ${key}[${idx}] with ${typeName}: Missing Keys: ${result.missingKeys.join(
                  ", "
                )}, Extra Keys: ${result.extraKeys.join(", ")}`
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
        const result = keysMatchRecursive(
          expectedKeys,
          requiredNested,
          value,
          schema
        );
        if (!result.isMatch) {
          nestedErrors.push(
            `In ${key}: Missing Keys: ${result.missingKeys.join(
              ", "
            )}, Extra Keys: ${result.extraKeys.join(", ")}`
          );
          if (result.nestedErrors.length > 0) {
            nestedErrors = nestedErrors.concat(result.nestedErrors);
          }
        }
      }
    }

    return {
      isMatch:
        missingKeys.length === 0 &&
        extraKeys.length === 0 &&
        nestedErrors.length === 0,
      missingKeys,
      extraKeys,
      nestedErrors,
    };
  }
  // Helper: Fetch required and recommended fields from schema
  function fetchRequiredAndRecommendedFields(schema) {
    // Required fields: standard JSON Schema
    const required = schema.required || [];
    // Recommended fields: codemeta uses "recommended" (array) or similar
    const recommended = schema.recommended || [];
    return { required, recommended };
  }

  // Helper: Get the field key for an input element
  function getFieldKey(input) {
    // Try to get the name attribute, fallback to id
    // Remove array notation if present (e.g., "author[familyName]" -> "author")
    let key = input.name || input.id || "";
    if (key.includes("[")) {
      key = key.split("[")[0];
    }
    // For hidden inputs in tagging/tagging_autocomplete, remove "HiddenInput" suffix
    if (key.endsWith("HiddenInput")) {
      key = key.replace(/HiddenInput$/, "");
    }
    return key;
  }

  // Function to dynamically mark mandatory fields based on required key in JSON schema
  function setMandatoryFieldsFromSchema() {
    fetch(JsonSchema)
      .then((response) => response.json())
      .then((schema) => {
        const { required, recommended } =
          fetchRequiredAndRecommendedFields(schema);

        required.forEach(function (fieldKey) {
          // Find all inputs where the name matches the required field

          inputs.forEach(function (input) {
            // 1. Standard input/select fields
            const standardInputs = document.querySelectorAll(
              `[name="${fieldKey}"]`
            );
            standardInputs.forEach(function (input) {
              input.setAttribute("required", true);
            });

            // 2. Tagging fields (hidden input for tagging/tagging_autocomplete)
            const hiddenInput = document.getElementById(
              fieldKey + "HiddenInput"
            );
            if (hiddenInput) {
              hiddenInput.setAttribute("required", true);
            }

            // 3. Add asterisk to the correct label
            // Try standard label first
            let label = document.querySelector(`label[for="${fieldKey}"]`);
            // If not found, try tagging label
            if (!label) {
              label = document.querySelector(
                `.tagging-label[for="${fieldKey}Input"]`
              );
            }
            if (label && !label.innerHTML.includes("*")) {
              const asterisk = document.createElement("span");
              asterisk.style.color = "red";
              asterisk.style.fontSize = "18px";
              asterisk.textContent = "*";
              label.appendChild(document.createTextNode(" "));
              label.appendChild(asterisk);
            }
          });
        });
      })
      .catch((error) => {
        console.error("Error loading the JSON schema:", error);
      });
  }

  setMandatoryFieldsFromSchema();

  function validateMandatoryFields(formData) {
    return new Promise((resolve, reject) => {
      fetch(JsonSchema)
        .then((response) => response.json())
        .then((schema) => {
          const requiredFields = schema.required || [];
          let isValid = true;
          let parsedData;

          try {
            parsedData = JSON.parse(formData);
          } catch (e) {
            console.error("Invalid JSON in formData:", e);
            reject("Invalid JSON");
            return;
          }

          requiredFields.forEach((field) => {
            if (!parsedData[field] || parsedData[field].trim() === "") {
              isValid = false;
            }
          });

          resolve(isValid);
        })
        .catch((error) => {
          console.error("Error loading the JSON schema:", error);
          reject(error);
        });
    });
  }
  //--------------------------------- Scheme End ------------------------------------------------------//

  //---------------------------------- Tagging-------------------------------------------//
  // Tagging Logic
  function setupTagging({
    containerId,
    hiddenInputId,
    inputId,
    suggestionsId = null,
    jsonKey,
    useAutocomplete = false,
    autocompleteSource = [],
  }) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const input = document.getElementById(inputId);
    const suggestionsBox = suggestionsId
      ? document.getElementById(suggestionsId)
      : null;

    // Detect if this is an object-tagging field (e.g., referencePublication)
    const label = document.querySelector(`.tagging-label[for="${inputId}"]`);
    const taggingType = label ? label.getAttribute("data-tagging-type") : null;
    // For tagging_object, get the constant type from data attribute (set in template)
    const objectKey = label
      ? label.getAttribute("data-tagging-object-key")
      : null;
    const constantType = label
      ? label.getAttribute("data-constant-type")
      : null;

    let selectedTags = [];

    // Parse initial value
    if (taggingType === "tagging_object") {
      try {
        const parsed = JSON.parse(hiddenInput.value);
        if (Array.isArray(parsed)) selectedTags = parsed;
      } catch {
        selectedTags = [];
      }
    } else {
      // tagging (array of strings)
      selectedTags = hiddenInput.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }

    // Render tags
    function renderTags() {
      container.querySelectorAll(".tag").forEach((tag) => tag.remove());
      if (taggingType === "tagging_object") {
        selectedTags.forEach((item) => {
          const identifier = item.identifier || "";
          const type = item["@type"] || constantType || "";
          const tag = document.createElement("span");
          tag.classList.add("tag");
          tag.setAttribute("data-value", identifier);
          tag.innerHTML = `${identifier}<span class="remove-tag" data-value="${identifier}">×</span>`;
          container.insertBefore(tag, input);
        });
      } else {
        selectedTags.forEach((item) => {
          const tag = document.createElement("span");
          tag.classList.add("tag");
          tag.setAttribute("data-value", item);
          tag.innerHTML = `${item}<span class="remove-tag" data-value="${item}">×</span>`;
          container.insertBefore(tag, input);
        });
      }
    }

    // Add tag logic
    function addTag(tagValue) {
      if (!tagValue) return;
      if (taggingType === "tagging_object") {
        if (selectedTags.some((item) => item.identifier === tagValue)) return;
        selectedTags.push({
          "@type": constantType || "ScholarlyArticle",
          identifier: tagValue,
        });
      } else {
        if (selectedTags.includes(tagValue)) return;
        selectedTags.push(tagValue);
      }
      renderTags();
      updateHidden();
      input.value = "";
      if (suggestionsBox) suggestionsBox.style.display = "none";
      input.classList.remove("invalid"); // Remove invalid color immediately
    }

    // Show yellow tag once if any tag exists
    if (selectedTags.length > 0) {
      const highlightTag = document.createElement("span");
      highlightTag.classList.add("highlight-tag");
      highlightTag.innerHTML = `⚠️ Suggestion: Curate here <span class="acknowledge-tag">Got it!</span>`;
      container.insertBefore(highlightTag, input);
    }

    if (useAutocomplete && suggestionsBox) {
      input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        suggestionsBox.innerHTML = "";

        if (!query) return (suggestionsBox.style.display = "none");

        const filtered = autocompleteSource.filter(
          (tag) =>
            tag.toLowerCase().startsWith(query) &&
            !(objectKey
              ? selectedTags.some((item) => item[objectKey] === tag)
              : selectedTags.includes(tag))
        );

        if (filtered.length === 0) {
          suggestionsBox.style.display = "none";
          return;
        }

        filtered.forEach((tag) => {
          const div = document.createElement("div");
          div.classList.add("suggestion-item");
          div.textContent = tag;
          div.onclick = () => addTag(tag);
          suggestionsBox.appendChild(div);
        });

        // --- Position the suggestion box using getBoundingClientRect ---
        updateSuggestionsBoxPosition(input, suggestionsBox);
        suggestionsBox.style.display = "block";
      });
      window.addEventListener(
        "scroll",
        () => updateSuggestionsBoxPosition(input, suggestionsBox),
        true
      );
      window.addEventListener("resize", () =>
        updateSuggestionsBoxPosition(input, suggestionsBox)
      );

      input.addEventListener("focus", () => {
        // Show all suggestions if input is empty, or filtered if not
        const query = input.value.trim().toLowerCase();
        suggestionsBox.innerHTML = "";

        // Filter as in your input event
        const filtered = autocompleteSource.filter(
          (tag) =>
            !(objectKey
              ? selectedTags.some((item) => item[objectKey] === tag)
              : selectedTags.includes(tag)) &&
            (query === "" || tag.toLowerCase().startsWith(query))
        );

        if (filtered.length === 0) {
          suggestionsBox.style.display = "none";
          return;
        }

        filtered.forEach((tag) => {
          const div = document.createElement("div");
          div.classList.add("suggestion-item");
          div.textContent = tag;
          div.onclick = () => addTag(tag);
          suggestionsBox.appendChild(div);
        });

        // Position the suggestion box
        const rect = input.getBoundingClientRect();
        suggestionsBox.style.position = "fixed";
        suggestionsBox.style.left = rect.left + "px";
        suggestionsBox.style.top = rect.bottom + "px";
        suggestionsBox.style.width = rect.width + "px";
        suggestionsBox.style.display = "block";
      });

      document.addEventListener("click", (e) => {
        if (!suggestionsBox.contains(e.target) && e.target !== input) {
          suggestionsBox.style.display = "none";
        }
      });
    }

    // Remove tag logic
    container.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-tag")) {
        const value = e.target.dataset.value;
        if (taggingType === "tagging_object") {
          selectedTags = selectedTags.filter(
            (item) => item.identifier !== value
          );
        } else {
          selectedTags = selectedTags.filter((tag) => tag !== value);
        }
        e.target.parentElement.remove();
        updateHidden();
      }
      if (e.target.classList.contains("acknowledge-tag")) {
        e.target.parentElement.remove();
      }
    });

    // Add tag on Enter
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const newTag = input.value.trim();
        if (useAutocomplete) {
          if (autocompleteSource.includes(newTag)) {
            addTag(newTag);
          } else {
            showInvalidTagMessage(
              container,
              input,
              "Please select a value from the list."
            );
            input.classList.add("invalid");
            setTimeout(() => input.classList.remove("invalid"), 1000);
            input.value = "";
          }
        } else if (newTag) {
          addTag(newTag);
        }
      }
    });

    // Update hidden input and JSON
    function updateHidden() {
      if (taggingType === "tagging_object") {
        hiddenInput.value = JSON.stringify(selectedTags);
      } else {
        hiddenInput.value = selectedTags.join(", ");
      }
      const jsonObject = JSON.parse(metadataJson.value);
      jsonObject[jsonKey] = selectedTags;
      metadataJson.value = JSON.stringify(jsonObject, null, 2);
    }

    // Initial render
    renderTags();
  }

  initializeTaggingFields();

  function initializeTaggingFields() {
    // Initialize all taggings and taggings_autocomplete
    document
      .querySelectorAll(".tagging-label[data-tagging]")
      .forEach((label) => {
        const key = label.getAttribute("data-tagging");
        const taggingType = label.getAttribute("data-tagging-type"); // "tagging" or "tagging_autocomplete"
        const containerId = key + "Tags";
        const hiddenInputId = key + "HiddenInput";
        const inputId = key + "Input";
        const suggestionsId = key + "Suggestions"; // You can use a convention for suggestions box IDs

        if (taggingType === "tagging_autocomplete") {
          if (key === "license") {
            fetch(SPDX_URL)
              .then((response) => response.json())
              .then((data) => {
                const spdxLicenses = data.licenses.map(
                  (license) => license.licenseId
                );
                console.info("Catched SPDX licenses:", spdxLicenses);
                setupTagging({
                  containerId,
                  hiddenInputId,
                  inputId,
                  suggestionsId,
                  jsonKey: key,
                  useAutocomplete: true,
                  autocompleteSource: spdxLicenses,
                });
              })
              .catch((error) =>
                console.error("Error fetching SPDX licenses:", error)
              );
          } else {
            // Fetch autocomplete source from schema or define it elsewhere
            fetch(JsonSchema)
              .then((res) => res.json())
              .then((schema) => {
                const autocompleteSource =
                  schema.properties?.[key]?.items?.enum || [];
                setupTagging({
                  containerId,
                  hiddenInputId,
                  inputId,
                  suggestionsId,
                  jsonKey: key,
                  useAutocomplete: true,
                  autocompleteSource: autocompleteSource,
                });
              });
          }
        } else {
          setupTagging({
            containerId,
            hiddenInputId,
            inputId,
            jsonKey: key,
            useAutocomplete: false,
          });
        }
      });
  }

  // Create a function of a nested single input
  function setupSingleInputObject({
    containerId,
    hiddenInputId,
    inputId,
    jsonKey,
  }) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const input = document.getElementById(inputId);

    // Get the constant type from the label
    const label = document.querySelector(
      `.single-input-object-label[for="${inputId}"]`
    );
    const constantType = label
      ? label.getAttribute("data-single-input-object-type")
      : null;

    // Parse initial value
    let valueObj = {};
    try {
      valueObj = JSON.parse(hiddenInput.value);
    } catch {
      valueObj = {};
    }

    // Set initial value
    if (valueObj.identifier) {
      input.value = valueObj.identifier;
    }

    // Update hidden input and JSON on change
    input.addEventListener("input", updateSingleInputObject);
    input.addEventListener("change", updateSingleInputObject);
    function updateSingleInputObject() {
      const identifier = input.value.trim();
      const obj = {
        "@type": constantType || "ScholarlyArticle",
        identifier: identifier,
      };
      hiddenInput.value = JSON.stringify(obj);

      // Update main JSON
      const jsonObject = JSON.parse(metadataJson.value);
      jsonObject[jsonKey] = obj;
      metadataJson.value = JSON.stringify(jsonObject, null, 2);
    }
  }

  document
    .querySelectorAll(".single-input-object-label[data-single-input-object]")
    .forEach((label) => {
      const key = label.getAttribute("data-single-input-object");
      const containerId = key + "Object";
      const hiddenInputId = key + "HiddenInput";
      const inputId = key + "Input";
      setupSingleInputObject({
        containerId,
        hiddenInputId,
        inputId,
        jsonKey: key,
      });
    });

  // General autocomplete technique
  function setupTagAutocompleteInput({
    input,
    selectedTagsProvider,
    autocompleteSource,
    onTagSelected,
    container,
  }) {
    // Create or get suggestions box
    let suggestionsBox = container.querySelector(".tag-suggestions-global");
    if (!suggestionsBox) {
      suggestionsBox = createSuggestionsBox(container);
    }

    input.addEventListener("input", function () {
      const query = input.value.trim().toLowerCase();
      suggestionsBox.innerHTML = "";
      if (!query) {
        suggestionsBox.style.display = "none";
        return;
      }
      const selectedTags = selectedTagsProvider();
      const filtered = autocompleteSource.filter(
        (tag) =>
          tag.toLowerCase().startsWith(query) && !selectedTags.includes(tag)
      );
      if (filtered.length === 0) {
        suggestionsBox.style.display = "none";
        return;
      }
      filtered.forEach((tag) => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = tag;
        div.style.cursor = "pointer";
        div.onclick = function () {
          onTagSelected(tag);
          suggestionsBox.style.display = "none";
        };
        suggestionsBox.appendChild(div);
      });
      // Position suggestions below the input
      updateSuggestionsBoxPosition(input, suggestionsBox);
      suggestionsBox.style.display = "block";
    });

    input.addEventListener("focus", function () {
      suggestionsBox.innerHTML = "";
      const query = input.value.trim().toLowerCase();
      const selectedTags = selectedTagsProvider();
      // Show all suggestions if input is empty, or filtered if not
      const filtered = autocompleteSource.filter(
        (tag) =>
          !selectedTags.includes(tag) &&
          (query === "" || tag.toLowerCase().startsWith(query))
      );
      if (filtered.length === 0) {
        suggestionsBox.style.display = "none";
        return;
      }
      filtered.forEach((tag) => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = tag;
        div.style.cursor = "pointer";
        div.onclick = function () {
          onTagSelected(tag);
          suggestionsBox.style.display = "none";
        };
        suggestionsBox.appendChild(div);
      });
      // Position suggestions below the input
      updateSuggestionsBoxPosition(input, suggestionsBox);
      suggestionsBox.style.display = "block";
    });

    // Hide suggestions on blur/click outside
    input.addEventListener("blur", function () {
      setTimeout(() => {
        suggestionsBox.style.display = "none";
      }, 200);
    });
  }

  // Enable tagging autocomplete
  function setupTableTagAutocomplete({ cell, autocompleteSource }) {
    const input = cell.querySelector(".tag-input");
    if (!input) return;
    const tagsList = cell.querySelector(".tags-list");
    setupTagAutocompleteInput({
      input,
      selectedTagsProvider: () =>
        Array.from(tagsList.querySelectorAll(".tag")).map((t) =>
          t.textContent.trim().replace("×", "").trim()
        ),
      autocompleteSource,
      onTagSelected: (tag) => {
        input.value = tag;
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      },
      container: cell,
    });
  }

  function createSuggestionsBox() {
    let suggestionsBox = document.querySelector(".tag-suggestions-global");
    if (!suggestionsBox) {
      suggestionsBox = document.createElement("div");
      suggestionsBox.className = "tag-suggestions tag-suggestions-global";
      suggestionsBox.style.position = "absolute";
      suggestionsBox.style.background = "#fff";
      suggestionsBox.style.border = "1px solid #ccc";
      suggestionsBox.style.zIndex = 10000;
      suggestionsBox.style.display = "none";
      document.body.appendChild(suggestionsBox);
    }
    return suggestionsBox;
  }

  function showInvalidTagMessage(container, input, message) {
    // Remove any existing invalid message
    const existing = container.querySelector(".invalid-tag-message");
    if (existing) existing.remove();

    const msg = document.createElement("span");
    msg.classList.add("highlight-tag", "invalid-tag-message");
    msg.innerHTML = `❌ ${message} <span class="acknowledge-tag">Got it!</span>`;
    container.insertBefore(msg, input);

    // Remove on click or after a timeout
    msg.querySelector(".acknowledge-tag").onclick = () => msg.remove();
    setTimeout(() => {
      if (msg.parentNode) msg.remove();
    }, 2500);
  }

  function updateSuggestionsBoxPosition(input, suggestionsBox) {
    const rect = input.getBoundingClientRect();
    suggestionsBox.style.left = rect.left + "px";
    suggestionsBox.style.top = rect.bottom + "px";
    suggestionsBox.style.width = rect.width + "px";
  }

  //-----------------------------tagging end-----------------------------------//

  //--------------------------------drop down------------------------------------//

  // Create a general dropdown class
  class DynamicDropdown {
    constructor(dropdownId, jsonSchemaUrl, schemaProperty) {
      this.dropdownId = dropdownId; // The ID of the dropdown element
      this.jsonSchemaUrl = jsonSchemaUrl; // The URL of the JSON schema
      this.schemaProperty = schemaProperty; // The property in the schema to use for options
    }

    populateDropdown() {
      fetch(this.jsonSchemaUrl)
        .then((response) => response.json())
        .then((schema) => {
          const enumValues =
            schema.properties?.[this.schemaProperty]?.enum || [];
          const dropdown = document.getElementById(this.dropdownId);

          if (!dropdown) {
            console.error(`Dropdown with ID "${this.dropdownId}" not found.`);
            return;
          }

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
  const dropdownElements = document.querySelectorAll(
    "select[data-dropdown-schema]"
  );

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
  // -----------------------------drop down end------------------------------------//

  // -------------------------------------table-----------------------------------//
  // New table
  function updateTableHiddenInput(key) {
    // Get all rows of the table
    const table = document.querySelector(`#${key}Table`);
    const hiddenInput = document.getElementById(`${key}TableHiddenInput`);
    if (!table || !hiddenInput) return;

    const atType = table.getAttribute("data-at-type");
    const rows = Array.from(table.querySelectorAll("tbody tr")).filter(
      (row) => !row.classList.contains("add-row-controls")
    ); // <-- skip add-row-controls

    // Check if this table is marked as unique
    if (table.getAttribute("unique-tab") === "True") {
      // Get all headers and their data-col and data-coltype
      const headerCells = Array.from(table.querySelectorAll("thead th"));
      const headers = headerCells.map((th) => ({
        name: th.getAttribute("data-col"),
        coltype: th.getAttribute("data-coltype"),
      }));

      // elements: all headers with data-coltype == 'element'
      const elements = headers
        .filter((h) => h.coltype === "element")
        .map((h) => h.name);

      // subElements: all headers not 'delete' or 'element'
      const subElements = headers
        .filter((h) => h.coltype !== "delete" && h.coltype !== "element")
        .map((h) => h.name);

      // Find the table body
      const tbody = table.querySelector("tbody");
      const rows = tbody
        ? Array.from(tbody.querySelectorAll("tr")).filter(
            (row) => !row.classList.contains("add-row-controls")
          )
        : [];
      const existingJson = JSON.parse(metadataJson.value);

      // Build elementList
      const elementList = {};
      elements.forEach((element) => {
        elementList[element] = [];
      });

      rows.forEach((row) => {
        const cells = Array.from(row.cells);
        // Build the element object from subElements
        let elementObj = { "@type": atType };
        subElements.forEach((field) => {
          const headerIdx = headers.findIndex(
            (h) =>
              h.name === field &&
              h.coltype !== "element" &&
              h.coltype !== "delete"
          );
          if (headerIdx >= 0 && cells[headerIdx]) {
            const coltype = headers[headerIdx].coltype;
            elementObj[field] = extractCellValue(cells[headerIdx], coltype);
          }
        });

        // For each element, check if the checkbox is checked
        elements.forEach((element) => {
          // Find the header index for this element
          const headerIdx = headers.findIndex((h) => h.name === element);
          if (headerIdx >= 0 && cells[headerIdx]) {
            const checkbox =
              cells[headerIdx].querySelector(".checkbox-element");
            if (checkbox && checkbox.checked) {
              elementList[element].push({ ...elementObj });
            }
          }
        });
      });

      // Update JSON
      Object.keys(elementList).forEach((element) => {
        existingJson[element] = elementList[element];
      });
      metadataJson.value = JSON.stringify(existingJson, null, 2);

      return;
    }

    if (rows.length === 0) {
      hiddenInput.value = "[]";
      // Also update the main JSON
      const jsonObject = JSON.parse(metadataJson.value);
      jsonObject[key] = [];
      metadataJson.value = JSON.stringify(jsonObject, null, 2);
      return;
    }

    // Get column headers (excluding the last "Delete" column)
    const headers = Array.from(table.querySelectorAll("thead th"))
      .map((th) => th.getAttribute("data-col"))
      .slice(0, -1);

    // Build array of objects
    const data = rows.map((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      let obj = {};
      if (atType) obj["@type"] = atType;
      headers.forEach((header, i) => {
        if (!header) return; // Skip if header is empty or undefined
        const cell = cells[i];
        if (!cell) {
          obj[header] = "";
          return;
        }
        const coltype = cell.getAttribute("data-coltype");
        obj[header] = extractCellValue(cell, coltype);
      });
      return obj;
    });

    hiddenInput.value = JSON.stringify(data);

    // Also update the main JSON
    const jsonObject = JSON.parse(metadataJson.value);
    jsonObject[key] = data;
    metadataJson.value = JSON.stringify(jsonObject, null, 2);
  }

  function extractCellValue(cell, coltype) {
    if (!cell) return "";
    if (coltype === "dropdown") {
      if (cell.hasAttribute("data-value")) {
        return cell.getAttribute("data-value");
      } else if (cell.querySelector("select")) {
        return cell.querySelector("select").value;
      } else {
        return cell.textContent.trim();
      }
    } else if (coltype === "tagging" || coltype === "tagging_autocomplete") {
      // Extract all tag values from data-tag or data-value attribute
      return Array.from(cell.querySelectorAll(".tag")).map((tagEl) => {
        let val =
          tagEl.getAttribute("data-tag") || tagEl.getAttribute("data-value");
        if (val) return val;
        // Remove the trailing " ×" or "×" from textContent
        return tagEl.textContent.replace(/\s*×$/, "").trim();
      });
    } else {
      return cell.textContent.trim();
    }
  }

  // Loop over all tables with the class 'auto-property-table'
  document
    .querySelectorAll("table.auto-property-table")
    .forEach(function (table) {
      // Extract the key from the table's id (assumes id is like 'copyrightHolderTable')
      const tableId = table.id;
      if (!tableId || !tableId.endsWith("Table")) return;
      const key = tableId.replace(/Table$/, "");

      // Attach a listener for cell edits (blur on any input or td)
      table.addEventListener(
        "blur",
        function (e) {
          if (e.target.tagName === "TD" || e.target.tagName === "INPUT") {
            updateTableHiddenInput(key);
          }
        },
        true
      );

      table.addEventListener("change", function (e) {
        if (e.target.classList.contains("checkbox-element")) {
          updateTableHiddenInput(key);
        }
      });

      // Optionally, update on row addition/removal or other events as needed
      // For initial sync
      updateTableHiddenInput(key);
    });

  // Add function to color add items when element is required or recommended and empty
  function highlightEmptyAddRowControls() {
    fetch(JsonSchema)
      .then((response) => response.json())
      .then((schema) => {
        const { required, recommended } =
          fetchRequiredAndRecommendedFields(schema);
        const allMandatory = [...required, ...recommended];

        document
          .querySelectorAll("table.auto-property-table")
          .forEach((table) => {
            const tableId = table.id;
            if (!tableId || !tableId.endsWith("Table")) return;
            const key = tableId.replace(/Table$/, "");

            // Find the corresponding add-row-controls
            const addRowControls = document.querySelector(
              `.add-row-controls[data-table-key="${key}"]`
            );
            if (!addRowControls) return;

            if (allMandatory.includes(key)) {
              const tbody = table.querySelector("tbody");
              const rows = tbody ? tbody.querySelectorAll("tr") : [];
              if (rows.length === 0) {
                addRowControls.classList.add("invalid");
              } else {
                addRowControls.classList.remove("invalid");
              }
            } else {
              addRowControls.classList.remove("invalid");
            }
          });
      });
  }
  // Initialize tables on load
  highlightEmptyAddRowControls();

  // Add Row functionality for all auto-property-tables
  document.querySelectorAll(".add-row-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const key = btn.getAttribute("data-table-key");
      const table = document.getElementById(key + "Table");
      const hiddenInput = document.getElementById(key + "TableHiddenInput");
      if (!table || !hiddenInput) return;

      // Find the add-row-controls row
      const addRowControls = table.querySelector(
        'tr.add-row-controls[data-table-key="' + key + '"]'
      );
      if (!addRowControls) return;

      // Get input values
      const inputs = addRowControls.querySelectorAll(
        ".add-row-input, .add-row-tag-input, .add-row-dropdown-select"
      );
      console.log({ inputs });
      const values = Array.from(inputs).map((input) => input.value.trim());

      // Prevent adding if all fields are empty
      const allEmpty = values.every((val) => val === "");
      if (allEmpty) return;

      // Create new row
      const newRow = document.createElement("tr");
      // Get column headers
      const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
        th.getAttribute("data-col")
      );
      // Only add data columns, skip the last header ("Delete")
      for (let i = 0; i < headers.length - 1; i++) {
        const header = headers[i];
        // Find the input for this column
        const input = Array.from(inputs).find(
          (inp) =>
            inp.getAttribute("data-col") === header &&
            !inp.classList.contains("invalid")
        );
        const th = table.querySelector(`thead th[data-col="${header}"]`);
        const colType = th
          ? th.getAttribute("data-coltype")
          : input
          ? input.getAttribute("data-coltype")
          : null;
        const col = input ? input.getAttribute("data-col") : null;
        const dataType = table.getAttribute("data-at-type");
        const td = document.createElement("td");
        console.log({ header, input, col, colType, dataType });
        if (colType === "element") {
          // Find the checkbox in the add-row-controls row
          console.log("Looking for checkbox with data-role:", col);
          const checkboxInput = addRowControls.querySelector(
            `input[type="checkbox"][data-role="${header}"]`
          );
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.classList.add("checkbox-element");
          checkbox.setAttribute("data-role", col);
          checkbox.name = `checkbox-${col}`;
          console.log("Try to check for checkbox");
          console.log({ checkboxInput });
          // Set checked state based on add-row-controls checkbox
          if (checkboxInput && checkboxInput.checked) {
            checkbox.checked = true;
            console.log("Copyied checked state");
          }
          td.setAttribute("data-col", col);
          td.setAttribute("data-coltype", "element");
          td.setAttribute("data-type", dataType);
          td.appendChild(checkbox);
        } else if (colType === "dropdown") {
          console.log("Got to dropdown");
          td.className = "table-tagging-cell";
          td.setAttribute("data-col", col);
          td.setAttribute("data-coltype", "dropdown");
          td.setAttribute("data-type", dataType);

          // Show the selected value as plain text
          const value = input ? input.value : "";
          console.log("Selected value:", input.value);
          td.textContent = value;
        } else if (
          colType === "tagging" ||
          colType === "tagging_autocomplete"
        ) {
          td.className = "table-tagging-cell";
          td.setAttribute("data-col", col);
          td.setAttribute("data-coltype", "tagging");
          td.setAttribute("data-type", dataType);
          // Tag UI
          const tagsList = document.createElement("div");
          tagsList.className = "tags-list";
          (addRowTags[col] || []).forEach((tag) => {
            const span = document.createElement("span");
            span.className = "tag";
            span.setAttribute("data-tag", tag);
            span.innerHTML =
              tag + ' <span class="remove-tag" data-tag="' + tag + '">×</span>';
            tagsList.appendChild(span);
          });
          const input = document.createElement("input");
          input.className = "tag-input";
          input.type = "text";
          input.style.display = "none";
          input.placeholder = "Add tag and press Enter";
          td.appendChild(tagsList);
          td.appendChild(input);
          // Reset tags for next row
          addRowTags[col] = [];
          // Remove tag elements from add-row-controls
          const addRowContainer = document.querySelector(
            '.add-row-tags-container[data-col="' + col + '"]'
          );
          if (addRowContainer) {
            addRowContainer
              .querySelectorAll(".tag")
              .forEach((tagEl) => tagEl.remove());
          }
          // If tagging_autocomplete, initialize autocomplete for this cell
          if (colType === "tagging_autocomplete") {
            fetch(JsonSchema)
              .then((res) => res.json())
              .then((schema) => {
                const autocompleteSource =
                  schema["$defs"]?.[dataType]?.properties?.[col]?.items?.enum ||
                  [];
                if (autocompleteSource.length > 0) {
                  setupTableTagAutocomplete({ cell: td, autocompleteSource });
                }
              });
          }
        } else {
          td.textContent = input ? input.value : "";
        }
        newRow.appendChild(td);
      }
      const deleteTd = document.createElement("td");
      deleteTd.innerHTML =
        '<i class="fas fa-trash-alt delete-row-btn" title="Delete row" style="cursor:pointer;"></i>';
      newRow.appendChild(deleteTd);

      // Insert new row above add-row-controls
      addRowControls.parentNode.insertBefore(newRow, addRowControls);

      initializeTableTaggingCells();

      // Clear input fields
      inputs.forEach((input) => {
        if (input.tagName === "SELECT") {
          input.selectedIndex = 0;
        } else {
          input.value = "";
        }
      });

      // Update hidden input
      updateTableHiddenInput(key);

      // Remove color
      addRowControls.classList.remove("invalid");
    });
  });

  // Store tags for each tagging column before row is added
  const addRowTags = {};

  // Initialize tagging for add-row-controls
  document.querySelectorAll(".add-row-tags-container").forEach((container) => {
    const col = container.getAttribute("data-col");
    addRowTags[col] = [];
    const input = container.querySelector(".add-row-tag-input");
    const colType = container.getAttribute("data-coltype");
    const dataType = container.getAttribute("data-type");
    // --- Autocomplete setup ---
    let autocompleteSource = [];
    let suggestionsBox = createSuggestionsBox(container);

    if (colType === "tagging_autocomplete") {
      fetch(JsonSchema)
        .then((res) => res.json())
        .then((schema) => {
          autocompleteSource =
            schema["$defs"]?.[dataType]?.properties?.[col]?.items?.enum || [];
        });

      input.addEventListener("input", function () {
        const query = input.value.trim().toLowerCase();
        suggestionsBox.innerHTML = "";
        if (!query || autocompleteSource.length === 0) {
          suggestionsBox.style.display = "none";
          return;
        }
        const selectedTags = addRowTags[col];
        const filtered = autocompleteSource.filter(
          (tag) =>
            tag.toLowerCase().startsWith(query) && !selectedTags.includes(tag)
        );
        if (filtered.length === 0) {
          suggestionsBox.style.display = "none";
          return;
        }
        filtered.forEach((tag) => {
          const div = document.createElement("div");
          div.className = "suggestion-item";
          div.textContent = tag;
          div.style.cursor = "pointer";
          div.onclick = function () {
            input.value = tag;
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
            suggestionsBox.style.display = "none";
          };
          suggestionsBox.appendChild(div);
        });
        // Position suggestions below the input
        const inputRect = input.getBoundingClientRect();
        suggestionsBox.style.left = inputRect.left + "px";
        suggestionsBox.style.top = inputRect.bottom + "px";
        suggestionsBox.style.width = input.offsetWidth + "px";
        suggestionsBox.style.display = "block";
      });

      input.addEventListener("focus", function () {
        suggestionsBox.innerHTML = "";
        if (!autocompleteSource.length) {
          suggestionsBox.style.display = "none";
          return;
        }
        const query = input.value.trim().toLowerCase();
        const selectedTags = addRowTags[col];
        const filtered = autocompleteSource.filter(
          (tag) =>
            !selectedTags.includes(tag) &&
            (query === "" || tag.toLowerCase().startsWith(query))
        );
        if (filtered.length === 0) {
          suggestionsBox.style.display = "none";
          return;
        }
        filtered.forEach((tag) => {
          const div = document.createElement("div");
          div.className = "suggestion-item";
          div.textContent = tag;
          div.style.cursor = "pointer";
          div.onclick = function () {
            input.value = tag;
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
            suggestionsBox.style.display = "none";
          };
          suggestionsBox.appendChild(div);
        });
        // Position suggestions below the input
        updateSuggestionsBoxPosition(input, suggestionsBox);
        suggestionsBox.style.display = "block";
      });

      window.addEventListener(
        "scroll",
        () => updateSuggestionsBoxPosition(input, suggestionsBox),
        true
      );
      window.addEventListener("resize", () =>
        updateSuggestionsBoxPosition(input, suggestionsBox)
      );

      // Hide suggestions on blur/click outside
      input.addEventListener("blur", function () {
        setTimeout(() => {
          suggestionsBox.style.display = "none";
        }, 200);
      });
    } else if (colType === "dropdown") {
      fetch(JsonSchema)
        .then((res) => res.json())
        .then((schema) => {
          const options =
            schema["$defs"]?.[dataType]?.properties?.[col]?.enum || [];
          const select = document.createElement("select");
          select.className = "add-row-dropdown-select";
          select.name = "selectElement";
          select.setAttribute("data-col", col);
          select.setAttribute("data-type", dataType);
          select.setAttribute("data-coltype", "dropdown");
          select.innerHTML =
            '<option value="">Select...</option>' +
            options
              .map((opt) => `<option value="${opt}">${opt}</option>`)
              .join("");
          // Replace the input with the select
          input.style.display = "none";
          container.appendChild(select);

          // On change, update addRowTags or values as needed
          select.addEventListener("change", function () {
            addRowTags[col] = [select.value];
            console.log("Selected value:", select.value);
          });
        });
    }

    // Add tag on Enter
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && input.value.trim() !== "") {
        e.preventDefault();
        const tag = input.value.trim();
        if (colType === "tagging_autocomplete") {
          if (autocompleteSource.includes(tag)) {
            if (!addRowTags[col].includes(tag)) {
              addRowTags[col].push(tag);

              // Create tag element
              const span = document.createElement("span");
              span.className = "tag";
              span.setAttribute("data-tag", tag);
              span.innerHTML =
                tag +
                ' <span class="remove-tag" data-tag="' +
                tag +
                '">×</span>';
              container.insertBefore(span, input);
            }
            input.value = "";
            if (suggestionsBox) suggestionsBox.style.display = "none";
          } else {
            showInvalidTagMessage(
              container,
              input,
              "Please select a value from the list."
            );
            input.classList.add("invalid");
            setTimeout(() => input.classList.remove("invalid"), 1000);
            input.value = "";
          }
        } else {
          // For plain tagging, just add the tag
          if (!addRowTags[col].includes(tag)) {
            addRowTags[col].push(tag);
            const span = document.createElement("span");
            span.className = "tag";
            span.setAttribute("data-tag", tag);
            span.innerHTML =
              tag + ' <span class="remove-tag" data-tag="' + tag + '">×</span>';
            container.insertBefore(span, input);
          }
          input.value = "";
        }
      }
    });

    // Remove tag on click
    container.addEventListener("click", function (e) {
      if (e.target.classList.contains("remove-tag")) {
        const tag = e.target.getAttribute("data-tag");
        addRowTags[col] = addRowTags[col].filter((t) => t !== tag);
        e.target.parentElement.remove();
      }
    });
  });

  // functionanilties within all auto-property-tables
  document
    .querySelectorAll("table.auto-property-table")
    .forEach(function (table) {
      table.addEventListener("click", function (e) {
        // Delete rows
        if (e.target.classList.contains("delete-row-btn")) {
          const row = e.target.closest("tr");
          if (row) {
            row.remove();
            // Update the hidden input
            const tableId = table.id;
            if (tableId && tableId.endsWith("Table")) {
              const key = tableId.replace(/Table$/, "");
              updateTableHiddenInput(key);
            }
          }
        }

        // Update other fields
        // Only allow editing on <td> that is not the last column (delete icon)
        const cell = e.target.closest("td");
        if (!cell) return;
        if (cell.classList.contains("table-tagging-cell")) return;
        if (cell.classList.contains("table-tagging-cell")) return;
        const row = cell.parentElement;
        const allCells = Array.from(row.children);
        // Don't edit the last cell (delete icon)
        if (allCells.indexOf(cell) === allCells.length - 1) return;
        // Prevent multiple inputs
        if (cell.querySelector("input")) return;

        const oldValue = cell.textContent;
        cell.innerHTML = "";
        const input = document.createElement("input");
        input.type = "text";
        input.value = oldValue;
        input.style.width = "100%";
        input.style.boxSizing = "border-box";
        cell.appendChild(input);
        input.focus();

        // Save on blur or Enter
        function save() {
          cell.textContent = input.value;
          // Update the hidden input for this table
          const tableId = table.id;
          if (tableId && tableId.endsWith("Table")) {
            const key = tableId.replace(/Table$/, "");
            updateTableHiddenInput(key);
          }
        }
        input.addEventListener("blur", save);
        input.addEventListener("keydown", function (evt) {
          if (evt.key === "Enter") {
            input.blur();
          } else if (evt.key === "Escape") {
            cell.textContent = oldValue;
          }
        });
      });
    });

  // Enable tag editing in table cells
  function initializeTableTaggingCells() {
    document.querySelectorAll("td.table-tagging-cell").forEach(function (cell) {
      // Prevent double-binding
      if (cell.dataset.taggingInitialized) return;
      cell.dataset.taggingInitialized = "true";

      const tagsList = cell.querySelector(".tags-list");
      let input = cell.querySelector(".tag-input");
      if (!input) {
        input = document.createElement("input");
        input.className = "tag-input";
        input.type = "text";
        input.style.display = "none";
        input.placeholder = "Add tag and press Enter";
        cell.appendChild(input);
      }

      // --- Autocomplete logic: fetch source and setup ---
      // You can set data-autocomplete-source on the cell or column header, or fetch from schema

      const col = cell.getAttribute("data-col");
      const colType = cell.getAttribute("data-coltype");
      const dataType = cell.getAttribute("data-type");
      // Example: fetch from schema if available
      if (colType == "tagging_autocomplete") {
        fetch(JsonSchema)
          .then((res) => res.json())
          .then((schema) => {
            autocompleteSource =
              schema["$defs"]?.[dataType]?.properties?.[col]?.items?.enum || [];
            if (autocompleteSource.length > 0) {
              setupTableTagAutocomplete({ cell, autocompleteSource });
            }
          });
      } else if (colType === "dropdown") {
        // Show value as plain text initially
        const currentValue =
          cell.getAttribute("data-value") || cell.textContent.trim() || "";
        cell.innerHTML = "";
        cell.textContent = currentValue;

        // Only show dropdown on cell click
        cell.addEventListener("click", function handleDropdownCellClick(e) {
          // Prevent multiple dropdowns
          if (cell.querySelector("select")) return;

          fetch(JsonSchema)
            .then((res) => res.json())
            .then((schema) => {
              const options =
                schema["$defs"]?.[dataType]?.properties?.[col]?.enum || [];
              const select = document.createElement("select");
              select.className = "table-dropdown-select";
              select.name = "ChangingSelect";
              select.innerHTML =
                '<option value="">Select...</option>' +
                options
                  .map((opt) => `<option value="${opt}">${opt}</option>`)
                  .join("");
              select.value = currentValue;

              // Replace cell content with select
              cell.innerHTML = "";
              cell.appendChild(select);
              select.focus();

              // On change or blur, update cell and data
              function finalizeSelection() {
                const selectedValue = select.value;
                cell.setAttribute("data-value", selectedValue);
                cell.innerHTML = selectedValue;

                // Remove this event listener to avoid duplicate dropdowns
                cell.removeEventListener("click", handleDropdownCellClick);

                // Re-attach the click event for future edits
                setTimeout(() => {
                  cell.addEventListener("click", handleDropdownCellClick);
                }, 0);

                // Update the hidden input and main JSON
                const table = cell.closest("table");
                if (table && table.id.endsWith("Table")) {
                  const key = table.id.replace(/Table$/, "");
                  updateTableHiddenInput(key);
                }
              }

              select.addEventListener("change", finalizeSelection);
              select.addEventListener("blur", finalizeSelection);
            });

          // Remove this event listener to prevent re-entry until finished
          cell.removeEventListener("click", handleDropdownCellClick);
        });

        return; // Skip further tag logic for dropdowns
      }

      // Show input when cell is clicked (not on tag or remove)
      cell.addEventListener("click", function (e) {
        if (
          e.target.classList.contains("remove-tag") ||
          e.target.classList.contains("tag")
        )
          return;
        input.style.display = "inline-block";
        input.focus();
        e.stopPropagation();
      });

      // Hide input when focus is lost
      input.addEventListener("blur", function () {
        setTimeout(function () {
          input.style.display = "none";
        }, 100);
      });

      // Add tag on Enter
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && input.value.trim() !== "") {
          e.preventDefault();
          e.stopPropagation();
          const tag = input.value.trim();
          if (
            [...tagsList.querySelectorAll(".tag")].some(
              (t) => t.textContent.trim() === tag + "×"
            )
          ) {
            input.value = "";
            return;
          }
          // Get autocompleteSource for this cell/column
          let autocompleteSource = [];
          const col = cell.getAttribute("data-col");
          const dataType = cell.getAttribute("data-type");
          const colType = cell.getAttribute("data-coltype");
          if (colType === "tagging_autocomplete") {
            // You may want to cache this for performance
            fetch(JsonSchema)
              .then((res) => res.json())
              .then((schema) => {
                autocompleteSource =
                  schema["$defs"]?.[dataType]?.properties?.[col]?.items?.enum ||
                  [];
                if (!autocompleteSource.includes(tag)) {
                  showInvalidTagMessage(
                    cell,
                    input,
                    "Please select a value from the list."
                  );
                  input.classList.add("invalid");
                  setTimeout(() => input.classList.remove("invalid"), 1000);
                  input.value = "";
                  return;
                }
              });
          }
          const span = document.createElement("span");
          span.className = "tag";
          span.setAttribute("data-tag", tag);
          span.innerHTML =
            tag + ' <span class="remove-tag" data-tag="' + tag + '">×</span>';
          tagsList.appendChild(span);
          input.value = "";
          const table = cell.closest("table");
          if (table && table.id.endsWith("Table")) {
            const key = table.id.replace(/Table$/, "");
            updateTableHiddenInput(key);
          }
        }
      });

      // Remove tag on click (cell-local)
      tagsList.addEventListener("click", function (e) {
        if (e.target.classList.contains("remove-tag")) {
          e.target.parentElement.remove();
          input.style.display = "inline-block";
          input.focus();
          const table = cell.closest("table");
          if (table && table.id.endsWith("Table")) {
            const key = table.id.replace(/Table$/, "");
            updateTableHiddenInput(key);
          }
          e.stopPropagation();
        }
      });
    });
  }

  initializeTableTaggingCells();

  // Hide all tag-inputs when clicking outside
  document.addEventListener("click", function () {
    document
      .querySelectorAll("td.table-tagging-cell .tag-input")
      .forEach(function (input) {
        input.style.display = "none";
      });
  });
  // ---------------------------------------------table end-----------------------------//

  // ---------------------------------------UI------------------------//

  // pop-up message for Contributor and Author tabs
  function showPopup() {
    document.getElementById("popup").style.display = "block";
  }
  var closeBtn = document.getElementById("closePopup");
  closeBtn.onclick = function () {
    document.getElementById("popup").style.display = "none";
  };

  window.onclick = function (event) {
    if (event.target == document.getElementById("popup")) {
      document.getElementById("popup").style.display = "none";
    }
  };

  // Function to check if the popup should be shown for a given tab and repo
  function checkAndShowPopup(tab, repo) {
    const key = `popupShown-${repo}-${tab}`;
    if (!localStorage.getItem(key)) {
      showPopup();
      localStorage.setItem(key, "true");
    }
  }

  document
    .querySelectorAll(".custom-tooltip-metadata")
    .forEach(function (element) {
      const tooltip = element.querySelector(".tooltip-text-metadata");
      const icon = element.querySelector("i");
      element.addEventListener("mouseenter", function () {
        tooltip.style.display = "block";
        tooltip.style.visibility = "visible";
        tooltip.style.opacity = "1";
        tooltip.style.position = "fixed";
        tooltip.style.zIndex = "9999";
        // Get the icon's position
        const rect = icon.getBoundingClientRect();
        const margin = 16;
        let left = rect.right;
        let top = rect.top + margin;

        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
      });

      element.addEventListener("mouseleave", function () {
        tooltip.style.display = "none";
        tooltip.style.visibility = "hidden";
        tooltip.style.opacity = "0";
      });
    });

  // show highlighted tag for keywords
  // copy button for json
  copyBtn.addEventListener("click", function (event) {
    event.preventDefault();
    metadataJson.select();
    document.execCommand("copy");
    actionFeedback("Text copied!");
  });

  function actionFeedback(value) {
    var feedback = document.getElementById("actionFeedback");
    feedback.innerHTML = value;
    feedback.style.display = "inline";
    setTimeout(function () {
      feedback.style.display = "none";
    }, 2000);
  }
  // Applying the yellow border for suggesting the user to change or review the extracted value
  urlInputs.forEach((input) => {
    const initialValue = input.value;
    if (initialValue !== "") {
      input.style.border = "2px solid yellow";
      input.style.backgroundColor = "#fef6da";
    }
    input.addEventListener("input", () => {
      if (input.value !== initialValue) {
        input.style.border = "";
        input.style.backgroundColor = "";
      } else if (initialValue !== "") {
        // Reapply the yellow border if the value is reset to the initial value
        input.style.border = "2px solid yellow";
        input.style.backgroundColor = "#fef6da";
      }
    });
  });

  // tabs_ext
  tabs_ext.forEach((tab) => {
    tab.addEventListener("click", function (event) {
      event.preventDefault();

      tabs_ext.forEach((item) => item.parentElement.classList.remove("active"));
      contents.forEach((content) => content.classList.remove("active"));

      this.parentElement.classList.add("active");
      let contentId = this.getAttribute("href");
      document.querySelector(contentId).classList.add("active");
    });
  });

  // Attach event listeners to all forward buttons
  document.querySelectorAll(".forwardBtn").forEach(function (forwardBtn) {
    forwardBtn.addEventListener("click", function (event) {
      event.preventDefault();

      // Find the currently active tab link
      const tabLinks = Array.from(
        document.querySelectorAll(".tab-links_ext a")
      );
      const activeTab = tabLinks.find((link) =>
        link.parentElement.classList.contains("active")
      );

      if (!activeTab) return;

      // Find the index of the current tab
      const currentIndex = tabLinks.indexOf(activeTab);

      // Go to the next tab if it exists
      if (currentIndex !== -1 && currentIndex < tabLinks.length - 1) {
        tabLinks[currentIndex + 1].click();
      }
    });
  });

  // Attach event listeners to all backward buttons
  document.querySelectorAll(".backwardBtn").forEach(function (backwardBtn) {
    backwardBtn.addEventListener("click", function (event) {
      event.preventDefault();

      // Find all tab links
      const tabLinks = Array.from(
        document.querySelectorAll(".tab-links_ext a")
      );
      // Find the currently active tab link
      const activeTab = tabLinks.find((link) =>
        link.parentElement.classList.contains("active")
      );

      if (!activeTab) return;

      // Find the index of the current tab
      const currentIndex = tabLinks.indexOf(activeTab);

      // Go to the previous tab if it exists
      if (currentIndex > 0) {
        tabLinks[currentIndex - 1].click();
      }
    });
  });

  // toggle
  function toggleSection() {
    var formContainer = document.getElementById("formContainer");
    var metadataFormDisplay = document.getElementById("metadataFormDisplay");
    var toggleSwitch = document.getElementById("toggleSwitch");
    var personInfoElements = document.querySelectorAll(".person-info"); // Select all elements with the class 'person-info'

    if (toggleSwitch.checked) {
      metadataFormDisplay.style.display = "block";
      formContainer.classList.remove("full-width");
      formContainer.classList.add("half-width");
      personInfoElements.forEach(function (element) {
        // element.style.width = '57%';
      });
    } else {
      metadataFormDisplay.style.display = "none";
      formContainer.classList.remove("half-width");
      formContainer.classList.add("full-width");
      personInfoElements.forEach(function (element) {
        element.style.width = "70%";
      });
    }
  }
  // Initialize the state on page load
  window.onload = function () {
    toggleSection();
    document
      .getElementById("toggleSwitch")
      .addEventListener("change", toggleSection);
  };
  function toggleCollapse() {
    const content = document.getElementById("contributor-explanation");
    if (content) {
      content.style.display =
        content.style.display === "none" || content.style.display === ""
          ? "block"
          : "none";
    }
  }
  window.toggleCollapse = toggleCollapse;

  function isTaggingObjectEmpty(tagsContainer) {
    // Count the number of .tag elements inside the tagsContainer
    const tagCount = tagsContainer.querySelectorAll(".tag").length;
    return tagCount === 0;
  }

  // Pinkish inputs, when no metadata is extracted
  function validateInput(input) {
    const skipValidationIds = [
      "contributorGivenNameInput",
      "contributorFamilyNameInput",
      "contributorEmailInput",
      "authorGivenNameInput",
      "authorFamilyNameInput",
      "authorEmailInput",
    ];
    if (skipValidationIds.includes(input.id)) {
      return; // Skip validation for the specified inputs
    }

    // Fetch schema and validate only if field is required or recommended
    fetch(JsonSchema)
      .then((response) => response.json())
      .then((schema) => {
        const { required, recommended } =
          fetchRequiredAndRecommendedFields(schema);
        const allMandatory = [...required, ...recommended];

        // --- Tagging support ---
        // If input is inside a tags-container, validate the hidden input instead
        const tagsContainer = input.closest(".tags-container");
        if (tagsContainer) {
          const taggingWrapper = tagsContainer.closest(".tagging-wrapper");
          if (taggingWrapper) {
            const hiddenInput = taggingWrapper.querySelector(
              'input[type="hidden"]'
            );
            const label = taggingWrapper.querySelector(".tagging-label");
            const taggingType = label
              ? label.getAttribute("data-tagging-type")
              : null;
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
  //------------------------------ UI end-------------------------------//

  //--------------------------------------- form update------------------------------//
  inputs.forEach((input) => validateInput(input));

  inputs.forEach((input) => {
    const handleChange = () => {
      validateInput(input);

      const jsonObject = JSON.parse(metadataJson.value);

      const key = input.name.split("[")[0];
      const subkey = input.name.split("[")[1]?.split("]")[0];

      const excludedInputs = [];

      // Collect all IDs of single input objects
      const singleInputObjectIds = Array.from(
        document.querySelectorAll("input[data-single-input-object]")
      )
        .map((input) => input.name) // or .id, depending on what you want to exclude by
        .filter((id) => id); // Filter out inputs without a name/id

      // Collect all IDs of single input in tables
      const singleInputTableIds = Array.from(
        document.querySelectorAll(
          ".auto-property-table input, .auto-property-table select, .auto-property-table textarea"
        )
      );

      excludedInputs.push(...singleInputObjectIds, ...singleInputTableIds);

      const addRowFields = document.querySelectorAll('[data-add-row="true"]');
      const addRowFieldNames = Array.from(addRowFields)
        .map((field) => field.name)
        .filter(Boolean);
      excludedInputs.push(...addRowFieldNames);

      if (!isInTable(input) && !isInAddRowControls(input)) {
        if (!excludedInputs.includes(input.name)) {
          if (subkey) {
            if (!jsonObject[key]) jsonObject[key] = {}; // make sure key exists
            jsonObject[key][subkey] = input.value;
          } else {
            jsonObject[key] = input.value;
          }
        }
        metadataJson.value = JSON.stringify(jsonObject, null, 2);
      }
    };

    // Attach event listeners for both inputs and selects
    input.addEventListener("input", handleChange);
    input.addEventListener("change", handleChange); // important for <select>
  });

  function isInTable(element) {
    return !!element.closest("table");
  }

  function isInAddRowControls(element) {
    return !!element.closest(".add-row-controls");
  }
  //--------------------------------- form update -------------------------------------//

  // ------------------------------------- Bi direcional --------------------------------------//
  function updateFormFromJson(jsonObject) {
    inputs.forEach((input) => {
      const key = input.name.split("[")[0];
      const subkey = input.name.split("[")[1]?.split("]")[0];

      // Exclude specific inputs from being updated
      const excludedInputs = [
        "contributor_givenName",
        "contributor_familyName",
        "contributor_email",
        "author_givenName",
        "author_familyName",
        "author_email",
      ];

      if (!excludedInputs.includes(input.name)) {
        if (subkey) {
          input.value = jsonObject[key][subkey];
        } else {
          input.value = jsonObject[key];
        }
        validateInput(input);
      }

      ["programmingLanguage", "keywords"].forEach((prop) => {
        if (jsonObject[prop]) {
          if (typeof jsonObject[prop] === "string") {
            jsonObject[prop] = jsonObject[prop]
              .split(",")
              .map((lang) => lang.trim())
              .filter((lang) => lang !== "");
          } else {
            jsonObject[prop] = jsonObject[prop].filter((lang) => lang !== "");
          }
        }
      });
    });
  }

  // Function to update the table with contributor and authors data
  function updateTable(jsonObject, tableID, fieldName) {
    const tableBody = document.getElementById(tableID);
    tableBody.innerHTML = ""; // Clear previous table rows

    // Loop through from jsonObject and create a row in the table
    jsonObject[fieldName].forEach((fieldName, index) => {
      if (
        fieldName.givenName ||
        fieldName.familyName ||
        fieldName.email ||
        fieldName.Email
      ) {
        const row = document.createElement("tr");

        const idCell = document.createElement("td");
        idCell.textContent = "#" + (index + 1);
        row.appendChild(idCell);

        const givenNameCell = document.createElement("td");
        givenNameCell.textContent = fieldName.givenName || "";
        row.appendChild(givenNameCell);

        const familyNameCell = document.createElement("td");
        familyNameCell.textContent = fieldName.familyName || "";
        row.appendChild(familyNameCell);

        const emailCell = document.createElement("td");
        emailCell.textContent = fieldName.email || fieldName.Email || "";
        row.appendChild(emailCell);

        if (tableID != "authorsTableBody") {
          const deleteCell = document.createElement("td");
          deleteCell.innerHTML = `<i title="Delete" class="fas fa-trash-alt" onclick="deletePerson(event, this, 'contributor')" data-action="delete"></i>`;
          row.appendChild(deleteCell);
        } else {
          const deleteCell = document.createElement("td");
          deleteCell.innerHTML = `<i title="Delete" class="fas fa-trash-alt" onclick="deletePerson(event, this, 'author')" data-action="delete"></i>`;
          row.appendChild(deleteCell);
        }
        tableBody.appendChild(row); // Add the row to the table body
      }
    });
  }
  //---------------------------- bi driectional end -----------------------------//

  //--------------------------download file ----------------------------------------//
  function downloadFile(event) {
    event.preventDefault();

    try {
      const data = metadataJson.value;

      const entered_metadata = JSON.parse(data); // Move inside try block
      const metadata = getCleanedMetadata(entered_metadata);
      const jsonKeys = Object.keys(metadata); // Extract keys from received JSON

      let repoName = "metadata"; // Default name

      fetch(JsonSchema)
        .then((response) => response.json())
        .then((schema) => {
          // Extract all property keys
          const allowedKeys = Object.keys(schema.properties || {});
          const requiredKeys = schema.required || [];

          // Get key comparison result
          const keyCheck = keysMatchRecursive(
            allowedKeys,
            requiredKeys,
            metadata,
            schema
          );

          if (!keyCheck.isMatch) {
            let errorMessage = "";
            if (keyCheck.missingKeys.length > 0) {
              errorMessage += `Not all required elements were filled. Please add content to the following elements:\n\n ${keyCheck.missingKeys.join(
                ", "
              )}\n`;
            }
            if (keyCheck.extraKeys.length > 0) {
              errorMessage += `There are elements which are not part of the standard. Please remove the following elements:\n\n: ${keyCheck.extraKeys.join(
                ", "
              )}\n`;
            }
            if (keyCheck.nestedErrors.length > 0) {
              errorMessage += `\nNested Errors:\n${keyCheck.nestedErrors.join(
                "\n"
              )}`;
            }
            alert(errorMessage);
          } else {
            jsonPrettier(repoName, metadata);
          }
        })
        .catch((error) => {
          console.error("Error loading schema:", error);
        });
    } catch (e) {
      let errorMessage = `\n\nCurrent Metadata:\n${JSON.stringify(
        metadata,
        null,
        2
      )}`;
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
    if (
      values[0] !== "https://w3id.org/codemeta/3.0" ||
      values[1] !== "SoftwareSourceCode"
    ) {
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
    //downloadButton.parentNode.insertBefore(link, downloadButton.nextSibling);
    //downloadBtn.parentNode.insertBefore(link, downloadBtn.nextSibling);
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
    Object.keys(obj).forEach((key) => {
      if (
        obj[key] &&
        typeof obj[key] === "object" &&
        !Array.isArray(obj[key])
      ) {
        // Recursively clean nested objects
        const cleanedNested = getCleanedMetadata(obj[key]);
        if (Object.keys(cleanedNested).length > 0) {
          cleanedObj[key] = cleanedNested;
        }
      } else if (Array.isArray(obj[key])) {
        // Remove empty elements from arrays
        const cleanedArray = obj[key].filter(
          (item) => item !== null && item !== undefined && item !== ""
        );
        if (cleanedArray.length > 0) {
          cleanedObj[key] = cleanedArray;
        }
      } else if (
        obj[key] !== null &&
        obj[key] !== undefined &&
        obj[key] !== ""
      ) {
        // Copy non-empty values
        cleanedObj[key] = obj[key];
      }
    });
    return cleanedObj;
  }

  downloadButton.addEventListener("click", (event) => {
    downloadFile(event);
  });
  downloadBtn.addEventListener("click", (event) => {
    downloadFile(event);
  });
  //------------------------------------ download end file------------------------//
});