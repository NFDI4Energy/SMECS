// table-utils.js

/*
Tracks user input in tables
Syncs table rows with the main JSON object
Handles input blur/change events to auto-update hidden fields and JSON
*/
import {
  fetchRequiredAndRecommendedFields,
  getSchema,
} from "./schema-utils.js";
import {
  updateSuggestionsBoxPosition,
  setupTableTagAutocomplete,
  createSuggestionsBox,
  enableEditableTagsInTable,
} from "./tagging.js";

const metadataJson = document.getElementById("metadata-json");

// New table
export function updateTableHiddenInput(key) {
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
          const checkbox = cells[headerIdx].querySelector(".checkbox-element");
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

// Function to extract cell value based on column type
export function extractCellValue(cell, coltype) {
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

// Set up event listeners on all auto-property-tables
export function setupTables() {
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
        td.className = "text-center";
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
            getSchema().then((schema) => {
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
      deleteTd.className = "d-flex justify-content-center align-items-center";
      deleteTd.style.height = "50px";
      deleteTd.innerHTML =
        '<i class="fas fa-trash-alt delete-row-btn" title="Delete row" style="cursor:pointer;"></i>';
      newRow.appendChild(deleteTd);

      // Insert new row above add-row-controls
      addRowControls.parentNode.insertBefore(newRow, addRowControls);

      initializeTableTaggingCells();
      enableEditableTagsInTable();
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
      getSchema().then((schema) => {
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
      getSchema().then((schema) => {
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

  initializeTableTaggingCells();

  // Hide all tag-inputs when clicking outside
  document.addEventListener("click", function () {
    document
      .querySelectorAll("td.table-tagging-cell .tag-input")
      .forEach(function (input) {
        input.style.display = "none";
      });
  });

  highlightEmptyAddRowControls();
}
// Add function to color add items when element is required or recommended and empty
export function highlightEmptyAddRowControls() {
  getSchema().then((schema) => {
    const { required, recommended } = fetchRequiredAndRecommendedFields(schema);
    const allMandatory = [...required, ...recommended];

    document.querySelectorAll("table.auto-property-table").forEach((table) => {
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

// Enable tag editing in table cells
export function initializeTableTaggingCells() {
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
    // ------------------------------Contributors table ends----------------------------////

    //--------------- --- Autocomplete logic: fetch source and setup --------------//

    // You can set data-autocomplete-source on the cell or column header, or fetch from schema

    const col = cell.getAttribute("data-col");
    const colType = cell.getAttribute("data-coltype");
    const dataType = cell.getAttribute("data-type");
    // Example: fetch from schema if available
    if (colType == "tagging_autocomplete") {
      getSchema().then((schema) => {
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
        getSchema().then((schema) => {
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
          getSchema().then((schema) => {
            autocompleteSource =
              schema["$defs"]?.[dataType]?.properties?.[col]?.items?.enum || [];
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
