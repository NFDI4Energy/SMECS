// tagging.js
/*Supports basic tagging and tagging with autocomplete
Dynamically adds/removes tags
Highlights suggested input
Provides reusable autocomplete logic for table cells and forms*/

import { getSchema } from "./schema-utils.js";
const SPDX_URL = 'https://raw.githubusercontent.com/spdx/license-list-data/master/json/licenses.json';
const metadataJson = document.getElementById("metadata-json");

// show highlighted tag for keywords

// Tagging Logic
export function setupTagging({
    containerId,
    hiddenInputId,
    inputId,
    suggestionsId = null,
    jsonKey,
    useAutocomplete = false,
    autocompleteSource = []
}) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const input = document.getElementById(inputId);
    const suggestionsBox = suggestionsId ? document.getElementById(suggestionsId) : null;

    // Detect if this is an object-tagging field (e.g., referencePublication)
    const label = document.querySelector(`.tagging-label[for="${inputId}"]`);
    const taggingType = label ? label.getAttribute('data-tagging-type') : null;
    // For tagging_object, get the constant type from data attribute (set in template)
    const objectKey = label ? label.getAttribute('data-tagging-object-key') : null;
    const constantType = label ? label.getAttribute('data-constant-type') : null;

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
            .map(v => v.trim())
            .filter(Boolean);
    }

    // Render tags
    function renderTags() {
        container.querySelectorAll('.tag').forEach(tag => tag.remove());
        if (taggingType === "tagging_object") {
            selectedTags.forEach(item => {
                const identifier = item.identifier || '';
                const type = item['@type'] || constantType || '';
                const tag = document.createElement("span");
                tag.classList.add("tag");
                tag.setAttribute("data-value", identifier);
                tag.innerHTML = `${identifier}<span class="remove-tag" data-value="${identifier}">×</span>`;
                container.insertBefore(tag, input);
            });
        } else {
            selectedTags.forEach(item => {
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
            if (selectedTags.some(item => item.identifier === tagValue)) return;
            selectedTags.push({ "@type": constantType || "ScholarlyArticle", "identifier": tagValue });
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
                tag => tag.toLowerCase().startsWith(query) &&
                    !(objectKey
                        ? selectedTags.some(item => item[objectKey] === tag)
                        : selectedTags.includes(tag))
            );

            if (filtered.length === 0) {
                suggestionsBox.style.display = "none";
                return;
            }

            filtered.forEach(tag => {
                const div = document.createElement("div");
                div.classList.add("suggestion-item");
                div.textContent = tag;
                div.onclick = () => addTag(tag);
                suggestionsBox.appendChild(div);
            });

            // --- Position the suggestion box using getBoundingClientRect ---
            updateSuggestionsBoxPosition(input, suggestionsBox)
            suggestionsBox.style.display = "block";
        });
        window.addEventListener('scroll', () => updateSuggestionsBoxPosition(input, suggestionsBox), true);
        window.addEventListener('resize', () => updateSuggestionsBoxPosition(input, suggestionsBox));

        input.addEventListener("focus", () => {
            // Show all suggestions if input is empty, or filtered if not
            const query = input.value.trim().toLowerCase();
            suggestionsBox.innerHTML = "";

            // Filter as in your input event
            const filtered = autocompleteSource.filter(
                tag => !(
                    objectKey
                        ? selectedTags.some(item => item[objectKey] === tag)
                        : selectedTags.includes(tag)
                ) && (query === "" || tag.toLowerCase().startsWith(query))
            );

            if (filtered.length === 0) {
                suggestionsBox.style.display = "none";
                return;
            }

            filtered.forEach(tag => {
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
                selectedTags = selectedTags.filter(item => item.identifier !== value);
            } else {
                selectedTags = selectedTags.filter(tag => tag !== value);
            }
            e.target.parentElement.remove();
            updateHidden();
        }
        if (e.target.classList.contains("acknowledge-tag")) {
            e.target.parentElement.remove();
        }
    });

    // Add tag on pressing Enter key
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const newTag = input.value.trim();
            if (useAutocomplete) {
                if (autocompleteSource.includes(newTag)) {
                    addTag(newTag);
                } else {
                    showInvalidTagMessage(container, input, "Please select a value from the list.");
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

export function initializeTaggingFields() {
    // Initialize all taggings and taggings_autocomplete
    document.querySelectorAll('.tagging-label[data-tagging]').forEach(label => {
        const key = label.getAttribute('data-tagging');
        const taggingType = label.getAttribute('data-tagging-type'); // "tagging" or "tagging_autocomplete"
        const containerId = key + 'Tags';
        const hiddenInputId = key + 'HiddenInput';
        const inputId = key + 'Input';
        const suggestionsId = key + 'Suggestions';

        if (taggingType === "tagging_autocomplete") {
            if (key === "license") {
                fetch(SPDX_URL)
                    .then(response => response.json())
                    .then(data => {
                        const spdxLicenses = data.licenses.map(license => license.licenseId);
                        setupTagging({
                            containerId,
                            hiddenInputId,
                            inputId,
                            suggestionsId,
                            jsonKey: key,
                            useAutocomplete: true,
                            autocompleteSource: spdxLicenses
                        });
                    })
                    .catch(error => console.error('Error fetching SPDX licenses:', error));
            } else {
                
                getSchema().then(schema => {
                        const autocompleteSource = schema.properties?.[key]?.items?.enum || [];
                        setupTagging({
                            containerId,
                            hiddenInputId,
                            inputId,
                            suggestionsId,
                            jsonKey: key,
                            useAutocomplete: true,
                            autocompleteSource
                        });
                    });
            }
        } else {
            setupTagging({
                containerId,
                hiddenInputId,
                inputId,
                jsonKey: key,
                useAutocomplete: false
            });
        }
    });

      document.querySelectorAll('.single-input-object-label[data-single-input-object]').forEach(label => {
        const key = label.getAttribute('data-single-input-object');
        const containerId = key + 'Object';
        const hiddenInputId = key + 'HiddenInput';
        const inputId = key + 'Input';
        setupSingleInputObject({
            containerId,
            hiddenInputId,
            inputId,
            jsonKey: key
        });
    });
}

   // Create a function of a nested single input
export function setupSingleInputObject({containerId,hiddenInputId,inputId,jsonKey}) {

        const container = document.getElementById(containerId);
        const hiddenInput = document.getElementById(hiddenInputId);
        const input = document.getElementById(inputId);

        // Get the constant type from the label
        const label = document.querySelector(`.single-input-object-label[for="${inputId}"]`);
        const constantType = label ? label.getAttribute('data-single-input-object-type') : null;

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
                "identifier": identifier
            };
            hiddenInput.value = JSON.stringify(obj);

            // Update main JSON
            const jsonObject = JSON.parse(metadataJson.value);
            jsonObject[jsonKey] = obj;
            metadataJson.value = JSON.stringify(jsonObject, null, 2);
        }
}

export function createSuggestionsBox() {
    let suggestionsBox = document.querySelector('.tag-suggestions-global');
    if (!suggestionsBox) {
        suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'tag-suggestions tag-suggestions-global';
        suggestionsBox.style.position = 'absolute';
        suggestionsBox.style.background = '#fff';
        suggestionsBox.style.border = '1px solid #ccc';
        suggestionsBox.style.zIndex = 10000;
        suggestionsBox.style.display = 'none';
        document.body.appendChild(suggestionsBox);
    }
    return suggestionsBox;
}

export function showInvalidTagMessage(container, input, message) {
    // Remove any existing invalid message
    const existing = container.querySelector('.invalid-tag-message');
    if (existing) existing.remove();

    const msg = document.createElement("span");
    msg.classList.add("highlight-tag", "invalid-tag-message");
    msg.innerHTML = `❌ ${message} <span class="acknowledge-tag">Got it!</span>`;
    container.insertBefore(msg, input);

    msg.querySelector('.acknowledge-tag').onclick = () => msg.remove();
    setTimeout(() => { if (msg.parentNode) msg.remove(); }, 2500);
}

export function updateSuggestionsBoxPosition(input, suggestionsBox) {
        const rect = input.getBoundingClientRect();
        suggestionsBox.style.left = rect.left + "px";
        suggestionsBox.style.top = rect.bottom + "px";
        suggestionsBox.style.width = rect.width + "px";
    }

  // General autocomplete technique
export function setupTagAutocompleteInput({ input, selectedTagsProvider, autocompleteSource, onTagSelected, container }) {
    // Create or get suggestions box
    let suggestionsBox = container.querySelector('.tag-suggestions-global');
    if (!suggestionsBox) {
        suggestionsBox = createSuggestionsBox(container);
    }

    input.addEventListener('input', function () {
        const query = input.value.trim().toLowerCase();
        suggestionsBox.innerHTML = '';
        if (!query) {
            suggestionsBox.style.display = 'none';
            return;
        }
        const selectedTags = selectedTagsProvider();
        const filtered = autocompleteSource.filter(
            tag => tag.toLowerCase().startsWith(query) && !selectedTags.includes(tag)
        );
        if (filtered.length === 0) {
            suggestionsBox.style.display = 'none';
            return;
        }
        filtered.forEach(tag => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = tag;
            div.style.cursor = 'pointer';
            div.onclick = function () {
                onTagSelected(tag);
                suggestionsBox.style.display = 'none';
            };
            suggestionsBox.appendChild(div);
        });
        // Position suggestions below the input
        updateSuggestionsBoxPosition(input, suggestionsBox);
        suggestionsBox.style.display = 'block';
    });

    input.addEventListener('focus', function () {
        suggestionsBox.innerHTML = '';
        const query = input.value.trim().toLowerCase();
        const selectedTags = selectedTagsProvider();
        // Show all suggestions if input is empty, or filtered if not
        const filtered = autocompleteSource.filter(
            tag => !selectedTags.includes(tag) && (query === "" || tag.toLowerCase().startsWith(query))
        );
        if (filtered.length === 0) {
            suggestionsBox.style.display = 'none';
            return;
        }
        filtered.forEach(tag => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = tag;
            div.style.cursor = 'pointer';
            div.onclick = function () {
                onTagSelected(tag);
                suggestionsBox.style.display = 'none';
            };
            suggestionsBox.appendChild(div);
        });
        // Position suggestions below the input
        updateSuggestionsBoxPosition(input, suggestionsBox);
        suggestionsBox.style.display = 'block';
    });

    // Hide suggestions on blur/click outside
    input.addEventListener('blur', function () {
        setTimeout(() => { suggestionsBox.style.display = 'none'; }, 200);
    });
}

 // Enable tagging autocomplete
 export function setupTableTagAutocomplete({ cell, autocompleteSource }) {
    const input = cell.querySelector('.tag-input');
    if (!input) return;
    const tagsList = cell.querySelector('.tags-list');
    setupTagAutocompleteInput({
        input,
        selectedTagsProvider: () => Array.from(tagsList.querySelectorAll('.tag')).map(t => t.textContent.trim().replace('×', '').trim()),
        autocompleteSource,
        onTagSelected: (tag) => {
            input.value = tag;
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        },
        container: cell
    });
}

