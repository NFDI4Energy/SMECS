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
    const input_languages = document.getElementById("languageInput");
    const inputLanguages = document.getElementById('languageInput');
    const suggestionsBox = document.getElementById('suggestions');
    const SPDX_URL = 'https://raw.githubusercontent.com/spdx/license-list-data/master/json/licenses.json';
    const JsonSchema = '/static/schema/codemeta_schema.json';
    let licenses = [];
    const licenseInput = document.getElementById('license-input');
    const licenseSuggestionsBox = document.getElementById('licenseSuggestions');
    const tagsContainer = document.getElementById("languageTags");
    const hiddenInput = document.getElementById("languageHiddenInput");

    const metadataJson = document.getElementById("metadata-json");
    const data = metadataJson.value;
    const metadata = JSON.parse(data);
    const repoName = metadata.name;

    let initialJson = metadataJson;
    let previousJson = { ...initialJson };

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
                            // asterisk.style.fontSize = '18px';
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
    var authorsTableBody = document.getElementById('authorsTableBody');

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
            if (tabId === '#tab2-contributors' || tabId === '#tab3-authors') {
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

    // programming and keywords tag logic
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

        let selectedTags = hiddenInput.value
            .split(",")
            .map(v => v.trim())
            .filter(Boolean);
        // Show yellow tag once if any keyword exists
        if (jsonKey === "keywords" && selectedTags.length > 0) {
            const highlightTag = document.createElement("span");
            highlightTag.classList.add("highlight-tag");
            highlightTag.innerHTML = `⚠️ Suggestion: Curate the keywords <span class="acknowledge-tag">Got it!</span>`;
            container.insertBefore(highlightTag, input);
        }

        if (useAutocomplete && suggestionsBox) {
            input.addEventListener("input", () => {
                const query = input.value.trim().toLowerCase();
                suggestionsBox.innerHTML = "";

                if (!query) return (suggestionsBox.style.display = "none");

                const filtered = autocompleteSource.filter(
                    tag => tag.toLowerCase().startsWith(query) && !selectedTags.includes(tag)
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

        function addTag(tagValue) {
            if (!tagValue || selectedTags.includes(tagValue)) return;

            selectedTags.push(tagValue);

            const tag = document.createElement("span");
            tag.classList.add("tag");
            tag.innerHTML = `${tagValue}<span class="remove-tag" data-value="${tagValue}">×</span>`;
            container.insertBefore(tag, input);

            updateHidden();
            input.value = "";
            if (suggestionsBox) suggestionsBox.style.display = "none";
        }

        container.addEventListener("click", (e) => {
            if (e.target.classList.contains("remove-tag")) {
                const value = e.target.dataset.value;
                selectedTags = selectedTags.filter(tag => tag !== value);
                e.target.parentElement.remove();
                updateHidden();
            }

            if (e.target.classList.contains("acknowledge-tag")) {
                e.target.parentElement.remove();  // Remove the yellow tag
            }
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const newTag = input.value.trim();
                if (newTag && !selectedTags.includes(newTag)) {
                    addTag(newTag);
                }
                input.value = "";
                if (suggestionsBox) suggestionsBox.style.display = "none";
            }
        });

        function updateHidden() {
            hiddenInput.value = selectedTags.join(", ");
            const jsonObject = JSON.parse(metadataJson.value);
            jsonObject[jsonKey] = selectedTags;
            metadataJson.value = JSON.stringify(jsonObject, null, 2);
        }
    }

    // Initialize programmingLanguage with autocomplete
    fetch(JsonSchema)
        .then(res => res.json())
        .then(schema => {
            const availableLanguages = schema.properties?.programmingLanguage?.items?.enum || [];

            setupTagging({
                containerId: "languageTags",
                hiddenInputId: "languageHiddenInput",
                inputId: "languageInput",
                suggestionsId: "suggestions",
                jsonKey: "programmingLanguage",
                useAutocomplete: true,
                autocompleteSource: availableLanguages
            });
        });

    // Initialize keywords without autocomplete
    setupTagging({
        containerId: "keywordsTags",
        hiddenInputId: "keywordsHiddenInput",
        inputId: "keywordsInput",
        jsonKey: "keywords",
        useAutocomplete: false
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

    // License
    // Fetch the SPDX licenses
    fetch(SPDX_URL)
        .then(response => response.json())
        .then(data => {
            licenses = data.licenses.map(license => license.licenseId);
        })
        .catch(error => console.error('Error fetching SPDX licenses:', error));

    licenseInput.addEventListener("input", function () {
        const query = licenseInput.value.toLowerCase().split(',').pop().trim();
        licenseSuggestionsBox.innerHTML = "";

        if (query.length === 0) {
            licenseSuggestionsBox.style.display = "none";
            return;
        }

        let existingLicenses = licenseInput.value.split(',').map(s => s.trim()).filter(Boolean);

        const matchedLicenses = licenses.filter(license =>
            license.toLowerCase().startsWith(query) && !existingLicenses.includes(license)
        );

        if (matchedLicenses.length > 0) {
            licenseSuggestionsBox.style.display = "block";

            matchedLicenses.forEach(license => {
                const div = document.createElement("div");
                div.classList.add("suggestion-item");
                div.textContent = license;
                div.addEventListener("click", function () {
                    existingLicenses[existingLicenses.length - 1] = license;
                    licenseInput.value = existingLicenses;
                    // licenseInput.value = existingLicenses.join(', ') + ', ';
                    licenseSuggestionsBox.style.display = "none";
                    licenseInput.focus();
                    const event = new Event('input', { bubbles: true });
                    licenseInput.dispatchEvent(event);
                });
                licenseSuggestionsBox.appendChild(div);
            });
        } else {
            licenseSuggestionsBox.style.display = "none";
        }
    });

    // Hide suggestions box when clicking outside
    document.addEventListener("click", function (e) {
        if (!licenseSuggestionsBox.contains(e.target) && e.target !== licenseInput) {
            licenseSuggestionsBox.style.display = "none";
        }
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
    const forwardBtnCon = document.getElementById('forwardBtnCon');
    const backwardBtn = document.getElementById('backwardBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const backwardBtnCon = document.getElementById('backwardBtnCon');


    forwardBtnCon.addEventListener('click', function (event) {
        event.preventDefault();
        document.querySelector('a[href="#tab2-contributors"]').click();
    });

    backwardBtn.addEventListener('click', function (event) {
        event.preventDefault();
        document.querySelector('a[href="#tab1-sw-info"]').click();
    });

    // forwardBtn.addEventListener('click', function (event) {
    //   event.preventDefault();
    //   document.querySelector('a[href="#tab3-authors"]').click();
    // });

    backwardBtnCon.addEventListener('click', function (event) {
        event.preventDefault();
        document.querySelector('a[href="#tab2-contributors"]').click();
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
    document.getElementById('addContributorButton').addEventListener('click', function () {
        addPerson('contributor', 'contributorsTableBody', ['Email']);
    });

    document.getElementById('addAuthorButton').addEventListener('click', function () {
        addPerson('author', 'authorsTableBody', ['Email']);
    });


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


    // For both checkboxes: Author and Contributor
    contributorsTableBody.addEventListener('change', function (event) {
        if (event.target.classList.contains('checkbox-contributor') || event.target.classList.contains('checkbox-author')) {
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
        let contributors = [];
        let authors = [];

        rows.forEach(row => {
            const givenName = row.cells[1]?.textContent.trim();
            const familyName = row.cells[2]?.textContent.trim();
            const email = row.cells[3]?.textContent.trim();

            const contributorCheckbox = row.querySelector('.checkbox-contributor');
            const authorCheckbox = row.querySelector('.checkbox-author');

            if (contributorCheckbox && contributorCheckbox.checked) {
                contributors.push({
                    "@type": "Person",
                    givenName,
                    familyName,
                    email
                });
            }

            if (authorCheckbox && authorCheckbox.checked) {
                authors.push({
                    "@type": "Person",
                    givenName,
                    familyName,
                    email
                });
            }
        });

        existingJson.contributor = contributors;
        existingJson.author = authors;
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
        // Checkbox cell for Contributor
        const contributorCell = newRow.insertCell(cellIndex++);
        const contributorCheckbox = document.createElement("input");
        contributorCheckbox.type = "checkbox";
        contributorCheckbox.classList.add("checkbox-contributor");
        contributorCell.appendChild(contributorCheckbox);

        // Checkbox cell for Author
        const authorCell = newRow.insertCell(cellIndex++);
        const authorCheckbox = document.createElement("input");
        authorCheckbox.type = "checkbox";
        authorCheckbox.classList.add("checkbox-author");
        authorCell.appendChild(authorCheckbox);

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
            if (cell.querySelector('i.fas.fa-trash-alt') || cell.querySelector('i.fas.fa-copy')) {
                continue;
            }
            // Skip delete icons or copy buttons
            if (cell.querySelector('i.fas.fa-trash-alt') || cell.querySelector('i.fas.fa-copy')) {
                continue;
            }

            // Skip cells that contain contributor/author checkboxes
            if (cell.querySelector('.checkbox-contributor') || cell.querySelector('.checkbox-author')) {
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


    inputs.forEach((input) => {
        const handleChange = () => {
            validateInput(input);

            const jsonObject = JSON.parse(metadataJson.value);

            const key = input.name.split("[")[0];
            const subkey = input.name.split("[")[1]?.split("]")[0];

            const excludedInputs = [
                "contributor_givenName", "contributor_familyName", "contributor_email",
                "author_givenName", "author_familyName", "author_email", "checkbox-contributor", "checkbox-author"
            ];

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


    function keysMatch(expectedKeys, jsonKeys, jsonObject) {
        // Convert both expected and actual keys to lowercase for case-insensitive matching
        const lowerExpectedKeys = expectedKeys.map(key => key.toLowerCase());
        const lowerJsonKeys = jsonKeys.map(key => key.toLowerCase());

        // Find missing and extra keys
        const missingKeys = lowerExpectedKeys.filter(key => !lowerJsonKeys.includes(key));
        const extraKeys = lowerJsonKeys.filter(key => !lowerExpectedKeys.includes(key));

        // Check nested key in "copyrightHolder"
        if (jsonObject.hasOwnProperty("copyrightHolder")) {
            if (!jsonObject.copyrightHolder.hasOwnProperty("name")) {
                missingKeys.push("copyrightHolder name key is missing");
            }
        }


        // Expected keys for nested 'author' and 'contributor' objects
        const nestedExpectedKeys = ["givenname", "familyname", "email"];
        let nestedErrors = [];

        ["author", "contributor"].forEach(section => {
            if (Array.isArray(jsonObject[section])) {
                jsonObject[section].forEach((item, index) => {
                    const itemKeys = Object.keys(item)
                        .map(k => k.toLowerCase()) // Convert nested keys to lowercase
                        .filter(k => k !== "@type"); // Ignore "@type"

                    const missingNested = nestedExpectedKeys.filter(k => !itemKeys.includes(k.toLowerCase()));
                    const extraNested = itemKeys.filter(k => !nestedExpectedKeys.includes(k.toLowerCase()));

                    if (missingNested.length > 0 || extraNested.length > 0) {
                        nestedErrors.push(`In ${section}[${index}]: Missing Keys: ${missingNested.join(", ")}, Extra Keys: ${extraNested.join(", ")}`);
                    }
                });
            }
        });

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

            const expectedKeys = [
                "@context", "@type", "name", "identifier", "description", "codeRepository",
                "url", "issueTracker", "license", "programmingLanguage", "copyrightHolder",
                "dateModified", "dateCreated", "keywords", "downloadUrl",
                "readme", "author", "contributor", "developmentStatus", "applicationCategory",
                "referencePublication", "funding", "funder", "reviewAspect", "reviewBody", "continuousIntegration",
                "runtimePlatform", "operatingSystem", "softwareRequirements", "citation", "version"
            ];
            // Get key comparison result
            const keyCheck = keysMatch(expectedKeys, jsonKeys, metadata);

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
        }
        catch (e) {
            alert("Invalid JSON. Please check your syntax.");
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
        downloadButton.parentNode.insertBefore(link, downloadButton.nextSibling);
        downloadBtn.parentNode.insertBefore(link, downloadBtn.nextSibling);
        link.click();
        setTimeout(() => {
            URL.revokeObjectURL(link.href);
            link.parentNode.removeChild(link);
        }, 0);
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