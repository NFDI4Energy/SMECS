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
    const inputs = document.querySelectorAll("#metadata-form input, #metadata-form select");
    const deleteButtons = document.querySelectorAll('[data-action="delete"]');
    let tabs_ext = document.querySelectorAll('.tab-links_ext a');
    let contents = document.querySelectorAll('.tab-content_ext .tab');
    const urlInputs = document.querySelectorAll('.url-input');
    const copyBtn = document.getElementById('copy-button');
    const SPDX_URL = 'https://raw.githubusercontent.com/spdx/license-list-data/master/json/licenses.json';
    const JsonSchema = '/static/schema/codemeta_schema.json';
    const metadataJson = document.getElementById("metadata-json");
    const data = metadataJson.value;
    const metadata = JSON.parse(data);
    const repoName = metadata.name;

    let initialJson = metadataJson;

    // Collect all unique data-roles
    const contributorsAndAuthorsTab = document.getElementById('ContributorsAndAuthors');
    const personCheckboxes = contributorsAndAuthorsTab.querySelectorAll('.checkbox-element');
    const personRoles = Array.from(new Set(
        Array.from(personCheckboxes).map(checkbox => checkbox.dataset.role)
    ));

    // Function to dynamically mark mandatory fields based on required key in JSON schema
    function setMandatoryFieldsFromSchema() {
        fetch(JsonSchema)
            .then(response => response.json())
            .then(data => {
                const requiredFields = data.required || [];  // Extract the required field names

                requiredFields.forEach(function (fieldKey) {
                    // Find all inputs where the name matches the required field

                    inputs.forEach(function (input) {
                        // Add the 'required' attribute to the input field
                        input.setAttribute('required', true);

                        // Add a red asterisk to the corresponding label
                        const label = document.querySelector(`label[for="${fieldKey}"]`);
                        if (label && !label.innerHTML.includes('*')) {
                            const asterisk = document.createElement('span');
                            asterisk.style.color = 'red';
                            asterisk.style.fontSize = '18px';
                            asterisk.textContent = '*';
                            label.appendChild(document.createTextNode(' '));  // Add space before asterisk
                            label.appendChild(asterisk);  // Add the asterisk after the label text
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Error loading the JSON schema:', error);
            });
    }

    setMandatoryFieldsFromSchema();

    function validateMandatoryFields(formData) {
        return new Promise((resolve, reject) => {
            fetch(JsonSchema)
                .then(response => response.json())
                .then(schema => {
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

                    requiredFields.forEach(field => {
                        if (!parsedData[field] || parsedData[field].trim() === "") {
                            isValid = false;
                        }
                    });

                    resolve(isValid);
                })
                .catch(error => {
                    console.error('Error loading the JSON schema:', error);
                    reject(error);
                });
        });
    }

    var contributorsTableBody = document.getElementById('contributorsTableBody');

    // pop-up message for Contributor and Author tabs
    function showPopup() {
        document.getElementById('popup').style.display = 'block';
    }
    var closeBtn = document.getElementById('closePopup');
    closeBtn.onclick = function () {
        document.getElementById('popup').style.display = 'none';
    }

    window.onclick = function (event) {
        if (event.target == document.getElementById('popup')) {
            document.getElementById('popup').style.display = 'none';
        }
    }

    // Function to check if the popup should be shown for a given tab and repo
    function checkAndShowPopup(tab, repo) {
        const key = `popupShown-${repo}-${tab}`;
        if (!localStorage.getItem(key)) {
            showPopup();
            localStorage.setItem(key, 'true');
        }
    }

    // Add event listeners to the tab links
    document.querySelectorAll('.tab-links_ext a').forEach(function (tabLink) {
        tabLink.addEventListener('click', function (event) {
            var tabId = this.getAttribute('href');
            if (tabId === '#ContributorsAndAuthors' || tabId === '#tab-authors') {
                checkAndShowPopup(tabId, repoName);
            }
        });
    });

    document.querySelectorAll('.custom-tooltip-metadata').forEach(function (element) {
        element.addEventListener('mouseenter', function () {
            const tooltip = element.querySelector('.tooltip-text-metadata');
            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';
        });

        element.addEventListener('mouseleave', function () {
            const tooltip = element.querySelector('.tooltip-text-metadata');
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
        });
    });

    // show highlighted tag for keywords
    function showKeywordHighlight(tagValue) {
        const highlightTag = document.createElement("span");
        highlightTag.classList.add("highlight-tag");
        highlightTag.innerHTML = `⚠️ ${tagValue} <span class="acknowledge-tag" data-value="${tagValue}">Got it</span>`;
        container.insertBefore(highlightTag, input);
    }

    // Tagging Logic
    function setupTagging({
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

        // Add tag on Enter
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const newTag = input.value.trim();
                if (newTag) addTag(newTag);
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
        document.querySelectorAll('.tagging-label[data-tagging]').forEach(label => {
            const key = label.getAttribute('data-tagging');
            const taggingType = label.getAttribute('data-tagging-type'); // "tagging" or "tagging_autocomplete"
            const containerId = key + 'Tags';
            const hiddenInputId = key + 'HiddenInput';
            const inputId = key + 'Input';
            const suggestionsId = key + 'Suggestions'; // You can use a convention for suggestions box IDs

            if (taggingType === "tagging_autocomplete") {
                if (key === "license") {
                    fetch(SPDX_URL)
                        .then(response => response.json())
                        .then(data => {
                            const spdxLicenses = data.licenses.map(license => license.licenseId);
                            console.info('Catched SPDX licenses:', spdxLicenses);
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
                    // Fetch autocomplete source from schema or define it elsewhere
                    fetch(JsonSchema)
                        .then(res => res.json())
                        .then(schema => {
                            const autocompleteSource = schema.properties?.[key]?.items?.enum || [];
                            setupTagging({
                                containerId,
                                hiddenInputId,
                                inputId,
                                suggestionsId,
                                jsonKey: key,
                                useAutocomplete: true,
                                autocompleteSource: autocompleteSource
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
    }

    // Create a function of a nested single input
    function setupSingleInputObject({
        containerId,
        hiddenInputId,
        inputId,
        jsonKey
    }) {
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
    
    // Create a general dropdown class
    class DynamicDropdown {
        constructor(dropdownId, jsonSchemaUrl, schemaProperty) {
            this.dropdownId = dropdownId; // The ID of the dropdown element
            this.jsonSchemaUrl = jsonSchemaUrl; // The URL of the JSON schema
            this.schemaProperty = schemaProperty; // The property in the schema to use for options
        }

        populateDropdown() {
            fetch(this.jsonSchemaUrl)
                .then(response => response.json())
                .then(schema => {
                    const enumValues = schema.properties?.[this.schemaProperty]?.enum || [];
                    const dropdown = document.getElementById(this.dropdownId);

                    if (!dropdown) {
                        console.error(`Dropdown with ID "${this.dropdownId}" not found.`);
                        return;
                    }

                    // Clear existing options
                    dropdown.innerHTML = '';

                    // Add default "Select" option
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = 'Select an option';
                    dropdown.appendChild(defaultOption);

                    // Populate dropdown with enum values
                    enumValues.forEach(value => {
                        const option = document.createElement('option');
                        option.value = value;
                        option.textContent = value;
                        dropdown.appendChild(option);
                    });
                })
                .catch(error => {
                    console.error(`Failed to load schema or populate dropdown for "${this.dropdownId}":`, error);
                });
        }
    }

    // Automatically initialize all dropdowns with the data-dropdown-schema attribute
    const dropdownElements = document.querySelectorAll('select[data-dropdown-schema]');

    dropdownElements.forEach(dropdown => {
        const schemaProperty = dropdown.getAttribute('data-dropdown-schema');
        const dropdownId = dropdown.id;

        if (schemaProperty && dropdownId) {
            // Create an instance of DynamicDropdown for each dropdown
            const dynamicDropdown = new DynamicDropdown(dropdownId, JsonSchema, schemaProperty);
            dynamicDropdown.populateDropdown();
        } else {
            console.error(`Dropdown with ID "${dropdownId}" is missing required attributes.`);
        }
    });

    // New table    
    function updateTableHiddenInput(key) {
        // Get all rows of the table
        const table = document.querySelector(`#${key}Table`);
        const hiddenInput = document.getElementById(`${key}TableHiddenInput`);
        if (!table || !hiddenInput) return;

        const rows = Array.from(table.querySelectorAll('tbody tr'));
        if (rows.length === 0) {
            hiddenInput.value = '[]';
            // Also update the main JSON
            const jsonObject = JSON.parse(metadataJson.value);
            jsonObject[key] = [];
            metadataJson.value = JSON.stringify(jsonObject, null, 2);
            return;
        }

        // Get column headers (excluding the last "Delete" column)
        const headers = Array.from(table.querySelectorAll('thead th'))
            .map(th => th.textContent.trim())
            .slice(0, -1);

        // Get @type from the table's data-at-type attribute
        const atType = table.getAttribute('data-at-type');

        // Build array of objects
        const data = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            let obj = {};
            if (atType) obj['@type'] = atType;
            headers.forEach((header, i) => {
                const cell = cells[i];
                if (!cell) {
                    obj[header] = '';
                    return;
                }
                if (cell.classList.contains('table-tagging-cell')) {
                    // Extract all tag values from data-tag or data-value attribute
                    const tags = Array.from(cell.querySelectorAll('.tag')).map(tagEl =>
                        tagEl.getAttribute('data-tag') || tagEl.getAttribute('data-value') || tagEl.textContent.trim()
                    );
                    obj[header] = tags;
                } else {
                    obj[header] = cell.textContent.trim();
                }
            });
            return obj;
        });

        hiddenInput.value = JSON.stringify(data);

        // Also update the main JSON
        const jsonObject = JSON.parse(metadataJson.value);
        jsonObject[key] = data;
        metadataJson.value = JSON.stringify(jsonObject, null, 2);
    }

    // Loop over all tables with the class 'auto-property-table'
    document.querySelectorAll('table.auto-property-table').forEach(function (table) {
        // Extract the key from the table's id (assumes id is like 'copyrightHolderTable')
        const tableId = table.id;
        if (!tableId || !tableId.endsWith('Table')) return;
        const key = tableId.replace(/Table$/, '');

        // Attach a listener for cell edits (blur on any input or td)
        table.addEventListener('blur', function (e) {
            if (e.target.tagName === 'TD' || e.target.tagName === 'INPUT') {
                updateTableHiddenInput(key);
            }
        }, true);

        // Optionally, update on row addition/removal or other events as needed
        // For initial sync
        updateTableHiddenInput(key);
    });

    // Add Row functionality for all auto-property-tables
    document.querySelectorAll('.add-row-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const key = btn.getAttribute('data-table-key');
            const table = document.getElementById(key + 'Table');
            const hiddenInput = document.getElementById(key + 'TableHiddenInput');
            if (!table || !hiddenInput) return;

            // Get column headers
            const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.getAttribute('data-col'));
            // Get input values
            const controls = btn.parentElement;            
            const inputs = controls.querySelectorAll('.add-row-input, .add-row-tag-input');
            const values = Array.from(inputs).map(input => input.value.trim());
                       
            // Prevent adding if all fields are empty (including tags)
            const allEmpty = Array.from(inputs).every(input => input.value.trim() === '') &&
                Object.values(addRowTags).every(tags => tags.length === 0);
            if (allEmpty) return;

            // Create new row
            const tbody = table.querySelector('tbody');
            const newRow = document.createElement('tr');
            // Only add data columns, skip the last header ("Delete")
            for (let i = 0; i < headers.length - 1; i++) {
                const header = headers[i];
                // Find the input for this column
                const input = Array.from(inputs).find(inp => inp.getAttribute('data-col') === header);
     
                if (!input) continue; // or handle error
                const col = inputs[i].getAttribute('data-col');
                const colType = inputs[i].getAttribute('data-coltype');
                const td = document.createElement('td');
                if (colType === 'tagging') {
                    td.className = 'table-tagging-cell';
                    td.setAttribute('data-col', col);
                    td.setAttribute('data-coltype', 'tagging');
                    // Tag UI
                    const tagsList = document.createElement('div');
                    tagsList.className = 'tags-list';
                    (addRowTags[col] || []).forEach(tag => {
                        const span = document.createElement('span');
                        span.className = 'tag';
                        span.setAttribute('data-tag', tag);
                        span.innerHTML = tag + ' <span class="remove-tag" data-tag="' + tag + '">×</span>';
                        tagsList.appendChild(span);
                    });
                    const input = document.createElement('input');
                    input.className = 'tag-input';
                    input.type = 'text';
                    input.style.display = 'none';
                    input.placeholder = 'Add tag and press Enter';
                    td.appendChild(tagsList);
                    td.appendChild(input);
                    // Reset tags for next row
                    addRowTags[col] = [];
                    // Remove tag elements from add-row-controls
                    const addRowContainer = document.querySelector('.add-row-tags-container[data-col="' + col + '"]');
                    if (addRowContainer) {
                        addRowContainer.querySelectorAll('.tag').forEach(tagEl => tagEl.remove());
                    }
                } else {
                    td.textContent = values[i] || '';
                }
                newRow.appendChild(td);
            }
            const deleteTd = document.createElement('td');
            deleteTd.innerHTML = '<i class="fas fa-trash-alt delete-row-btn" title="Delete row" style="cursor:pointer;"></i>';
            newRow.appendChild(deleteTd);
            tbody.appendChild(newRow);
            initializeTableTaggingCells();

            // Clear input fields
            inputs.forEach(input => input.value = '');

            // Update hidden input
            updateTableHiddenInput(key);
        });
    });

    // Store tags for each tagging column before row is added
    const addRowTags = {};

    // Initialize tagging for add-row-controls
    document.querySelectorAll('.add-row-tags-container').forEach(container => {
        const col = container.getAttribute('data-col');
        addRowTags[col] = [];
        const input = container.querySelector('.add-row-tag-input');

        // Add tag on Enter
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && input.value.trim() !== '') {
                e.preventDefault();
                const tag = input.value.trim();
                if (!addRowTags[col].includes(tag)) {
                    addRowTags[col].push(tag);

                    // Create tag element
                    const span = document.createElement('span');
                    span.className = 'tag';
                    span.setAttribute('data-tag', tag);
                    span.innerHTML = tag + ' <span class="remove-tag" data-tag="' + tag + '">×</span>';
                    // Insert before input
                    container.insertBefore(span, input);
                }
                input.value = '';
            }
        });

        // Remove tag on click
        container.addEventListener('click', function (e) {
            if (e.target.classList.contains('remove-tag')) {
                const tag = e.target.getAttribute('data-tag');
                addRowTags[col] = addRowTags[col].filter(t => t !== tag);
                e.target.parentElement.remove();
            }
        });
    });

    // functionanilties within all auto-property-tables
    document.querySelectorAll('table.auto-property-table').forEach(function (table) { 
        table.addEventListener('click', function (e) {
            // Delete rows
            if (e.target.classList.contains('delete-row-btn')) {
                const row = e.target.closest('tr');
                if (row) {
                    row.remove();
                    // Update the hidden input
                    const tableId = table.id;
                    if (tableId && tableId.endsWith('Table')) {
                        const key = tableId.replace(/Table$/, '');
                        updateTableHiddenInput(key);
                    }
                }
            }

            // Update other fields
            // Only allow editing on <td> that is not the last column (delete icon)
            const cell = e.target.closest('td');
            if (!cell) return;
            if (cell.classList.contains('table-tagging-cell')) return;
            const row = cell.parentElement;
            const allCells = Array.from(row.children);
            // Don't edit the last cell (delete icon)
            if (allCells.indexOf(cell) === allCells.length - 1) return;
            // Prevent multiple inputs
            if (cell.querySelector('input')) return;

            const oldValue = cell.textContent;
            cell.innerHTML = '';
            const input = document.createElement('input');
            input.type = 'text';
            input.value = oldValue;
            input.style.width = '100%';
            input.style.boxSizing = 'border-box';
            cell.appendChild(input);
            input.focus();

            // Save on blur or Enter
            function save() {
                cell.textContent = input.value;
                // Update the hidden input for this table
                const tableId = table.id;
                if (tableId && tableId.endsWith('Table')) {
                    const key = tableId.replace(/Table$/, '');
                    updateTableHiddenInput(key);
                }
            }
            input.addEventListener('blur', save);
            input.addEventListener('keydown', function (evt) {
                if (evt.key === 'Enter') {
                    input.blur();
                } else if (evt.key === 'Escape') {
                    cell.textContent = oldValue;
                }
            });

        });
    });

    // Enable tag editing in table cells
    function initializeTableTaggingCells() {
        document.querySelectorAll('td.table-tagging-cell').forEach(function (cell) {
            // Prevent double-binding
            if (cell.dataset.taggingInitialized) return;
            cell.dataset.taggingInitialized = "true";

            const tagsList = cell.querySelector('.tags-list');
            let input = cell.querySelector('.tag-input');
            if (!input) {
                input = document.createElement('input');
                input.className = 'tag-input';
                input.type = 'text';
                input.style.display = 'none';
                input.placeholder = 'Add tag and press Enter';
                cell.appendChild(input);
            }

            // Show input when cell is clicked (not on tag or remove)
            cell.addEventListener('click', function (e) {
                if (e.target.classList.contains('remove-tag') || e.target.classList.contains('tag')) return;
                input.style.display = 'inline-block';
                input.focus();
                e.stopPropagation();
            });

            // Hide input when focus is lost
            input.addEventListener('blur', function () {
                setTimeout(function () { input.style.display = 'none'; }, 100);
            });

            // Add tag on Enter
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && input.value.trim() !== '') {
                    e.preventDefault();
                    e.stopPropagation();
                    const tag = input.value.trim();
                    if ([...tagsList.querySelectorAll('.tag')].some(t => t.textContent.trim() === tag + '×')) {
                        input.value = '';
                        return;
                    }
                    const span = document.createElement('span');
                    span.className = 'tag';
                    span.setAttribute('data-tag', tag);
                    span.innerHTML = tag + ' <span class="remove-tag" data-tag="' + tag + '">×</span>';
                    tagsList.appendChild(span);
                    input.value = '';
                    const table = cell.closest('table');
                    if (table && table.id.endsWith('Table')) {
                        const key = table.id.replace(/Table$/, '');
                        updateTableHiddenInput(key);
                    }
                }
            });

            // Remove tag on click (cell-local)
            tagsList.addEventListener('click', function (e) {
                if (e.target.classList.contains('remove-tag')) {
                    e.target.parentElement.remove();
                    input.style.display = 'inline-block';
                    input.focus();
                    const table = cell.closest('table');
                    if (table && table.id.endsWith('Table')) {
                        const key = table.id.replace(/Table$/, '');
                        updateTableHiddenInput(key);
                    }
                    e.stopPropagation();
                }
            });
        });
    }

    initializeTableTaggingCells();

    // Hide all tag-inputs when clicking outside
    document.addEventListener('click', function () {
        document.querySelectorAll('td.table-tagging-cell .tag-input').forEach(function (input) {
            input.style.display = 'none';
        });
    });

    // copy button for json
    copyBtn.addEventListener('click', function (event) {
        event.preventDefault();
        metadataJson.select();
        document.execCommand('copy');
        actionFeedback("Text copied!");
    });

    function actionFeedback(value) {
        var feedback = document.getElementById('actionFeedback');
        feedback.innerHTML = value;
        feedback.style.display = 'inline';
        setTimeout(function () {
            feedback.style.display = 'none';
        }, 2000);

    }
    // Applying the yellow border for suggesting the user to change or review the extracted value
    urlInputs.forEach(input => {
        const initialValue = input.value;
        if (initialValue !== "") {
            input.style.border = '2px solid yellow';
            input.style.backgroundColor = '#fef6da';
        }
        input.addEventListener('input', () => {
            if (input.value !== initialValue) {
                input.style.border = '';
                input.style.backgroundColor = '';
            } else if (initialValue !== "") {
                // Reapply the yellow border if the value is reset to the initial value
                input.style.border = '2px solid yellow';
                input.style.backgroundColor = '#fef6da';
            }
        });
    });


    // tabs_ext
    tabs_ext.forEach(tab => {
        tab.addEventListener('click', function (event) {
            event.preventDefault();

            tabs_ext.forEach(item => item.parentElement.classList.remove('active'));
            contents.forEach(content => content.classList.remove('active'));

            this.parentElement.classList.add('active');
            let contentId = this.getAttribute('href');
            document.querySelector(contentId).classList.add('active');
        });
    });

    // Attach event listeners to all forward buttons
    document.querySelectorAll('.forwardBtn').forEach(function (forwardBtn) {
        forwardBtn.addEventListener('click', function (event) {
            event.preventDefault();

            // Find the currently active tab link
            const tabLinks = Array.from(document.querySelectorAll('.tab-links_ext a'));
            const activeTab = tabLinks.find(link => link.parentElement.classList.contains('active'));

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
    document.querySelectorAll('.backwardBtn').forEach(function (backwardBtn) {
        backwardBtn.addEventListener('click', function (event) {
            event.preventDefault();

            // Find all tab links
            const tabLinks = Array.from(document.querySelectorAll('.tab-links_ext a'));
            // Find the currently active tab link
            const activeTab = tabLinks.find(link => link.parentElement.classList.contains('active'));

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
        var formContainer = document.getElementById('formContainer');
        var metadataFormDisplay = document.getElementById('metadataFormDisplay');
        var toggleSwitch = document.getElementById('toggleSwitch');
        var personInfoElements = document.querySelectorAll('.person-info'); // Select all elements with the class 'person-info'

        if (toggleSwitch.checked) {
            metadataFormDisplay.style.display = 'block';
            formContainer.classList.remove('full-width');
            formContainer.classList.add('half-width');
            personInfoElements.forEach(function (element) {
                // element.style.width = '57%';
            });
        } else {
            metadataFormDisplay.style.display = 'none';
            formContainer.classList.remove('half-width');
            formContainer.classList.add('full-width');
            personInfoElements.forEach(function (element) {
                element.style.width = '70%';
            });
        }
    }
    // Initialize the state on page load
    window.onload = function () {
        toggleSection();
        document.getElementById('toggleSwitch').addEventListener('change', toggleSection);
    };

    // contributor and author table
    const addPersonBtn = document.getElementById('addPersonButton');
    if (addPersonBtn) {
        addPersonBtn.addEventListener('click', function () {
            addPerson('contributor', 'contributorsTableBody', ['Email']);
        });
    }

    // Contributor/Author tables
    function handleTableClick(tableBody, editCallback) {
        tableBody.addEventListener('click', function (event) {
            if (event.target.tagName === 'TD' && event.target.cellIndex !== 0 && !event.target.querySelector('input[type="checkbox"]')) {
                // Check if the clicked cell is not the first column
                editCallback(event.target);
            }
        });
    }
    // Usage for contributors table
    handleTableClick(contributorsTableBody, (cell) => editCell(cell, 'contributor', ['email']));


    // For all checkboxes in the Author and Contributor tab
    contributorsAndAuthorsTab.addEventListener('change', function (event) {
        if (
            event.target.type === 'checkbox' &&
            event.target.classList.contains('checkbox-element')
        ) {
            updateContributorsAndAuthorsJson();
        }
    });

    // Handle row deletion and update JSON accordingly
    window.handleDelete = function (event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.target;
        const row = button.closest('tr');
        if (!row) {
            console.error("Row not found for deletion");
            return;
        }

        row.remove(); // Remove the row visually
        updateContributorsAndAuthorsJson(); // Sync JSON
    };

    // Update JSON for contributors and authors based on checkbox state
    function updateContributorsAndAuthorsJson() {
        const contributorsTableBody = document.getElementById('contributorsTableBody');
        const rows = contributorsTableBody.querySelectorAll('tr');
        const existingJson = JSON.parse(metadataJson.value);

        const roleList = {};
        personRoles.forEach(role => {
            roleList[role] = [];
        });

        rows.forEach(row => {
            const givenName = row.cells[1]?.textContent.trim();
            const familyName = row.cells[2]?.textContent.trim();
            const email = row.cells[3]?.textContent.trim();

            row.querySelectorAll('.checkbox-element').forEach(checkbox => {
                const role = checkbox.dataset.role;
                if (role && checkbox.checked) {
                    roleList[role].push({
                        "@type": "Person",
                        givenName,
                        familyName,
                        email
                    });
                }
            });
        });

        Object.keys(roleList).forEach(role => {
            existingJson[role] = roleList[role];
        });
        metadataJson.value = JSON.stringify(existingJson, null, 2);
    }


    // Pinkish inputs, when no metadata is extracted
    function validateInput(input) {
        const skipValidationIds = [
            'contributorGivenNameInput',
            'contributorFamilyNameInput',
            'contributorEmailInput',
            'authorGivenNameInput',
            'authorFamilyNameInput',
            'authorEmailInput'
        ];

        // Check if input is inside a tags-container (tagging field)
        const tagsContainer = input.closest('.tags-container');
        if (tagsContainer) {
            // Find the hidden input in the parent tagging-wrapper
            const taggingWrapper = tagsContainer.closest('.tagging-wrapper');
            if (taggingWrapper) {
                const hiddenInput = taggingWrapper.querySelector('input[type="hidden"]');
                if (hiddenInput && hiddenInput.value.trim() !== "") {
                    input.classList.remove("invalid");
                    return;
                }
            }
        }

        if (skipValidationIds.includes(input.id)) {
            return; // Skip validation for the specified inputs
        }

        if (input.value.trim() === "") {
            input.classList.add("invalid");
        } else {
            input.classList.remove("invalid");
        }
    }
    //add person to the table
    function addPerson(type, tableBodyId, properties) {
        var givenNameInput = document.getElementById(`${type}GivenNameInput`);
        var familyNameInput = document.getElementById(`${type}FamilyNameInput`);
        var emailInput = document.getElementById(`${type}EmailInput`);

        // Check if any of the input fields are empty
        if (!givenNameInput.value.trim() && !familyNameInput.value.trim() && !emailInput.value.trim()) {
            alert('Please provide all required information.');
            return;
        }

        // Get the table body
        var tableBody = document.getElementById(`${type}sTableBody`);

        // Insert a new row at the end of the table
        var newRow = tableBody.insertRow(tableBody.rows.length);

        // Insert cells into the new row
        var cellIndex = 0;
        newRow.insertCell(cellIndex++).textContent = `#${tableBody.rows.length}`;
        newRow.insertCell(cellIndex++).textContent = givenNameInput.value;
        newRow.insertCell(cellIndex++).textContent = familyNameInput.value;

        // Add new-row class to the newly created row
        newRow.classList.add('new-row');

        // Iterate over additional properties and insert cells
        properties.forEach((prop, index) => {
            var input = document.getElementById(`${type}${prop}Input`);
            newRow.insertCell(cellIndex++).textContent = input.value;
        });

        personRoles.forEach(role => {
            const cell = newRow.insertCell(cellIndex++);
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.classList.add("checkbox-element");
            checkbox.setAttribute("data-role", role);
            cell.appendChild(checkbox);
        });

        // Add delete button with icon
        const deletecell = newRow.insertCell(cellIndex++);
        const deleteButton = document.createElement('i');
        deleteButton.classList.add('fas', 'fa-trash-alt');
        deleteButton.setAttribute('data-action', 'delete');
        deleteButton.onclick = function (event) { handleDelete(event); };
        deletecell.appendChild(deleteButton);

        givenNameInput.value = '';
        familyNameInput.value = '';
        emailInput.value = '';


        // Update Contributor/Author numbers for all remaining rows
        for (let i = 0; i < tableBody.rows.length; i++) {
            tableBody.rows[i].cells[0].textContent = `#${i + 1}`;
        }

        // updateJsonData(`${type}sTableBody`, type, properties);
        validateRowCells(newRow);
    }


    // Initialize table with existing contributors and authors
    function initializeTables() {
        const contributorsRows = document.getElementById('contributorsTableBody').rows;
        for (let i = 0; i < contributorsRows.length; i++) {
            validateRowCells(contributorsRows[i]); // Validate each row during initialization
        }
    }

    // Validate each cell in the row in table
    function validateRowCells(row) {
        for (let i = 0; i < row.cells.length; i++) {
            const cell = row.cells[i];
            // Skip delete icons or copy buttons
            if (cell.querySelector('i.fas.fa-trash-alt') || cell.querySelector('i.fas.fa-copy')) {
                continue;
            }

            // Skip cells that contain contributor/author checkboxes
            if (cell.querySelector('.checkbox-element')) {
                continue;
            }

            // Check if the cell is empty and apply validation
            if (cell.textContent.trim() === "") {
                cell.classList.add("invalid");
            } else {
                cell.classList.remove("invalid");
            }
        }
    }

    // Initialize tables on load
    initializeTables();


    function editCell(cell, type, properties) {
        // Check if the clicked cell is in the delete button column
        if (cell.cellIndex === cell.parentElement.cells.length - 1 || cell.querySelector('i[data-action="delete"]')) {
            return;
        }

        var currentValue = cell.textContent;

        // Create an input element
        var inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.value = currentValue;

        // Get the current dimensions of the cell before editing
        var cellWidth = cell.offsetWidth;
        var cellHeight = cell.offsetHeight;

        // Apply styles to fix cell dimensions
        cell.style.width = cellWidth + 'px';
        cell.style.height = cellHeight + 'px';
        cell.style.padding = '0'; // Remove padding to prevent resizing

        // Replace the cell content with the input element
        cell.innerHTML = '';
        cell.appendChild(inputElement);

        // Apply the same dimensions to the input element
        inputElement.style.width = cellWidth + 'px';
        inputElement.style.height = cellHeight + 'px';
        inputElement.style.boxSizing = 'border-box';

        // Focus on the input element
        inputElement.focus();

        // Handle editing completion
        inputElement.addEventListener('blur', function () {
            cell.textContent = inputElement.value;

            // Reset the cell's inline styles after editing is done
            cell.style.width = '';
            cell.style.height = '';
            cell.style.padding = '';

            validateRowCells(cell.parentElement);
            updateJsonData(`${type}sTableBody`, type, properties);
        });
    }

    function updateJsonData(tableBodyId, jsonDataProperty, additionalProperties) {
        var tableBody = document.getElementById(tableBodyId);
        var data = [];

        // Iterate through table rows and update JSON data
        for (var i = 0; i < tableBody.rows.length; i++) {
            var rowData = {
                "@type": "Person",
                givenName: tableBody.rows[i].cells[1].textContent,
                familyName: tableBody.rows[i].cells[2].textContent,
            };

            additionalProperties.forEach((prop, index) => {
                rowData[prop] = tableBody.rows[i].cells[index + 3].textContent; // Assuming additional properties start from cell index 3
            });

            data.push(rowData);
        }


        var existingJson = JSON.parse(metadataJson.value);
        existingJson[jsonDataProperty] = data;
        metadataJson.value = JSON.stringify(existingJson, null, 2);
    }

    inputs.forEach(input => validateInput(input));

    inputs.forEach((input) => {
        const handleChange = () => {
            validateInput(input);

            const jsonObject = JSON.parse(metadataJson.value);

            const key = input.name.split("[")[0];
            const subkey = input.name.split("[")[1]?.split("]")[0];

            const excludedInputs = [
                "contributor_givenName", "contributor_familyName", "contributor_email",
                "author_givenName", "author_familyName", "author_email", "checkbox-contributor", "checkbox-maintainer", "checkbox-author"
            ];

            // Collect all IDs of the checkboxes
            const checkboxIds = Array.from(personCheckboxes)
                .map(checkbox => checkbox.id)
                .filter(id => id); // Filter out checkboxes without an ID

            // Collect all IDs of single input objects
            const singleInputObjectIds = Array.from(document.querySelectorAll('input[data-single-input-object]'))
                .map(input => input.name) // or .id, depending on what you want to exclude by
                .filter(id => id); // Filter out inputs without a name/id

            // Add the checkbox IDs to the excludedInputs array
            excludedInputs.push(...checkboxIds, ...singleInputObjectIds);

            if (!excludedInputs.includes(input.name)) {
                if (subkey) {
                    if (!jsonObject[key]) jsonObject[key] = {}; // make sure key exists
                    jsonObject[key][subkey] = input.value;
                } else {
                    jsonObject[key] = input.value;
                }
            }

            metadataJson.value = JSON.stringify(jsonObject, null, 2);
        };

        // Attach event listeners for both inputs and selects
        input.addEventListener("input", handleChange);
        input.addEventListener("change", handleChange); // important for <select>
    });


    function updateFormFromJson(jsonObject) {
        inputs.forEach((input) => {
            

            const key = input.name.split("[")[0];
            const subkey = input.name.split("[")[1]?.split("]")[0];

            // Exclude specific inputs from being updated
            const excludedInputs = ["contributor_givenName", "contributor_familyName", "contributor_email", "author_givenName", "author_familyName", "author_email"];

            if (!(excludedInputs.includes(input.name))) {
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
        })
    }


    // Function to update the table with contributor and authors data
    function updateTable(jsonObject, tableID, fieldName) {
        const tableBody = document.getElementById(tableID);
        tableBody.innerHTML = ''; // Clear previous table rows


        // Loop through from jsonObject and create a row in the table
        jsonObject[fieldName].forEach((fieldName, index) => {
            if (fieldName.givenName || fieldName.familyName || (fieldName.email || fieldName.Email)) {

                const row = document.createElement('tr');

                const idCell = document.createElement("td");
                idCell.textContent = "#" + (index + 1);
                row.appendChild(idCell);

                const givenNameCell = document.createElement('td');
                givenNameCell.textContent = fieldName.givenName || '';
                row.appendChild(givenNameCell);

                const familyNameCell = document.createElement('td');
                familyNameCell.textContent = fieldName.familyName || '';
                row.appendChild(familyNameCell);

                const emailCell = document.createElement('td');
                emailCell.textContent = fieldName.email || fieldName.Email || '';
                row.appendChild(emailCell);

                if (tableID != 'authorsTableBody') {

                    const deleteCell = document.createElement("td");
                    deleteCell.innerHTML = `<i title="Delete" class="fas fa-trash-alt" onclick="deletePerson(event, this, 'contributor')" data-action="delete"></i>`;
                    row.appendChild(deleteCell);

                }
                else {
                    const deleteCell = document.createElement("td");
                    deleteCell.innerHTML = `<i title="Delete" class="fas fa-trash-alt" onclick="deletePerson(event, this, 'author')" data-action="delete"></i>`;
                    row.appendChild(deleteCell);
                };
                tableBody.appendChild(row); // Add the row to the table body

            };
        });
    }

    // Check if contributors are more than 10
    if (contributorsTableBody.rows.length > 10) {
        contributorsTableBody.parentElement.classList.add('scrollable-table');
    }

    function getNestedExpectedKeys(schema, typeName) {
        // For JSON Schema Draft-07 and later, use $defs; for older, use definitions
        const defs = schema.$defs || schema.definitions || {};
        const typeDef = defs[typeName];
        if (!typeDef || !typeDef.properties) {
            return [];
        }
        // Exclude @type if you want
        return Object.keys(typeDef.properties).filter(key => key !== "@type");
    }

    function matchKeys(allowedKeys, requiredKeys, jsonKeys) {
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

    function keysMatchRecursive(allowedKeys, requiredKeys, jsonObject, schema) {
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

    function toggleCollapse() {
        const content = document.getElementById('contributor-explanation');
        if (content) {
            content.style.display = (content.style.display === 'none' || content.style.display === '') ? 'block' : 'none';
        }
    }
    window.toggleCollapse = toggleCollapse;


    function downloadFile(event) {
        event.preventDefault();

        try {
            const data = metadataJson.value;

            const metadata = JSON.parse(data); // Move inside try block
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
                        let errorMessage = "Metadata keys do not match!\n\n";
                        if (keyCheck.missingKeys.length > 0) {
                            errorMessage += `Missing Keys: ${keyCheck.missingKeys.join(", ")}\n`;
                        }
                        if (keyCheck.extraKeys.length > 0) {
                            errorMessage += `Extra Keys: ${keyCheck.extraKeys.join(", ")}\n`;
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
            const cleanedMetadata = getCleanedMetadata(metadata);
            validJson = JSON.stringify(cleanedMetadata, null, 2);
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

    downloadButton.addEventListener("click", (event) => {
        downloadFile(event);
    });
    downloadBtn.addEventListener("click", (event) => {
        downloadFile(event);
    });

});