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

import { showToast } from "./ui.js";

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
  // Loop over all tables with the class 'auto-property'
  document.querySelectorAll("table.auto-property").forEach(function (table) {
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
      if (allEmpty) {
        showToast("Please fill the given fields before adding row", "error");
        return;
      }

      // ✅ Combination Validation
      const getInputVal = (col) =>
        Array.from(inputs)
          .find((i) => i.getAttribute("data-col") === col)
          ?.value.trim() || "";

      const identifier = getInputVal("identifier");
      const givenName = getInputVal("givenName");
      const familyName = getInputVal("familyName");

      let emailTagValue = "";
      const emailTagContainer = addRowControls.querySelector(
        '.add-row-tags-container[data-col="email"]'
      );
      if (emailTagContainer) {
        const emailTag = emailTagContainer.querySelector(".tag");
        if (emailTag) emailTagValue = emailTag.dataset.tag.trim();
      }

      if (table.id !== "copyrightHolderTable") {
        // Condition 1: Identifier + Given Name + Family Name
        const condition1 = identifier && givenName && familyName;

        // Condition 2: Given Name + Family Name + Email
        const condition2 = givenName && familyName && emailTagValue;

        // If neither condition is satisfied → stop row creation
        if (!condition1 && !condition2) {
          // alert(
          //   "Please fill either: Identifier + Given Name + Family Name OR Given Name + Family Name + Email."
          // );
          showToast(
            "Please fill either: Identifier + Given Name + Family Name OR Given Name + Family Name + Email.",
            "error"
          );
          return;
        }
      }

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
        td.classList.add("text-left");
        // td.className = "text-center";
        if (colType === "element") {
          // Find the checkbox in the add-row-controls row
          const checkboxInput = addRowControls.querySelector(
            `input[type="checkbox"][data-role="${header}"]`
          );
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.classList.add("checkbox-element");
          checkbox.setAttribute("data-role", col);
          checkbox.name = `checkbox-${col}`;

          // Set checked state based on add-row-controls checkbox
          if (checkboxInput && checkboxInput.checked) {
            checkbox.checked = true;
          }
          td.setAttribute("data-col", col);
          td.setAttribute("data-coltype", "element");
          td.setAttribute("data-type", dataType);
          td.appendChild(checkbox);
        } else if (colType === "tagging") {
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
        } else {
          td.textContent = input ? input.value : "";
        }
        newRow.appendChild(td);
      }

      if (table.id !== "copyrightHolderTable") {
        if (newRow.firstElementChild) {
          newRow.removeChild(newRow.firstElementChild);
        }
        const selectcheckbox = document.createElement("td");
        const lastcolumn = document.createElement("td");
        selectcheckbox.className = "text-center";
        selectcheckbox.innerHTML = `<input type="checkbox" class="checkbox-select" data-role="select" name="checkbox-select">`;
        newRow.prepend(selectcheckbox);
        newRow.appendChild(lastcolumn);
      } else {
        const deleteTd = document.createElement("td");

        deleteTd.className = "d-flex justify-content-center align-items-center";
        deleteTd.style.height = "50px";
        deleteTd.innerHTML =
          '<i class="fas fa-trash-alt delete-row-btn" title="Delete row" style="cursor:pointer;"></i>';
        newRow.appendChild(deleteTd);
      }

      // Insert new row above add-row-controls
      addRowControls.parentNode.insertBefore(newRow, addRowControls);
      showToast("New row has been added", "success");
      // Check if this td contains a checkbox
      document.querySelectorAll("td").forEach((td) => {
        if (td.querySelector('input[type="checkbox"]')) {
          td.classList.remove("text-left"); // remove old alignment
          td.classList.add("text-center"); // add new alignment
        }
      });
      initializeTableTaggingCells();
      enableEditableTagsInTable();

      // Clear input fields and checkboxes
      inputs.forEach((input) => (input.value = "")); // reset text/tag inputs
      const checkboxes = addRowControls.querySelectorAll(
        'input[type="checkbox"]'
      );
      checkboxes.forEach((cb) => (cb.checked = false));
      // Update hidden input
      updateTableHiddenInput(key);

      // Remove color
      addRowControls.classList.remove(
        "invalid-required",
        "invalid-recommended"
      );
    });
  });

  // Store tags for each tagging column before row is added
  const addRowTags = {};

  // Initialize tagging for add-row-controls
  document.querySelectorAll(".add-row-tags-container").forEach((container) => {
    const col = container.getAttribute("data-col");
    addRowTags[col] = [];
    const input = container.querySelector(".add-row-tag-input");
    // const colType = container.getAttribute("data-coltype");
    // const dataType = container.getAttribute("data-type");
    // // --- Autocomplete setup ---
    // let autocompleteSource = [];
    // let suggestionsBox = createSuggestionsBox(container);

    // if (colType === "tagging_autocomplete") {
    //   getSchema().then((schema) => {
    //     autocompleteSource =
    //       schema["$defs"]?.[dataType]?.properties?.[col]?.items?.enum || [];
    //   });

    //   input.addEventListener("input", function () {
    //     const query = input.value.trim().toLowerCase();
    //     suggestionsBox.innerHTML = "";
    //     if (!query || autocompleteSource.length === 0) {
    //       suggestionsBox.style.display = "none";
    //       return;
    //     }
    //     const selectedTags = addRowTags[col];
    //     const filtered = autocompleteSource.filter(
    //       (tag) =>
    //         tag.toLowerCase().startsWith(query) && !selectedTags.includes(tag)
    //     );
    //     if (filtered.length === 0) {
    //       suggestionsBox.style.display = "none";
    //       return;
    //     }
    //     filtered.forEach((tag) => {
    //       const div = document.createElement("div");
    //       div.className = "suggestion-item";
    //       div.textContent = tag;
    //       div.style.cursor = "pointer";
    //       div.onclick = function () {
    //         input.value = tag;
    //         input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    //         suggestionsBox.style.display = "none";
    //       };
    //       suggestionsBox.appendChild(div);
    //     });
    //     // Position suggestions below the input
    //     const inputRect = input.getBoundingClientRect();
    //     updateSuggestionsBoxPosition(input, suggestionsBox);
    //   });

    //   input.addEventListener("focus", function () {
    //     suggestionsBox.innerHTML = "";
    //     if (!autocompleteSource.length) {
    //       suggestionsBox.style.display = "none";
    //       return;
    //     }
    //     const query = input.value.trim().toLowerCase();
    //     const selectedTags = addRowTags[col];
    //     const filtered = autocompleteSource.filter(
    //       (tag) =>
    //         !selectedTags.includes(tag) &&
    //         (query === "" || tag.toLowerCase().startsWith(query))
    //     );
    //     if (filtered.length === 0) {
    //       suggestionsBox.style.display = "none";
    //       return;
    //     }
    //     filtered.forEach((tag) => {
    //       const div = document.createElement("div");
    //       div.className = "suggestion-item";
    //       div.textContent = tag;
    //       div.style.cursor = "pointer";
    //       div.onclick = function () {
    //         input.value = tag;
    //         input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    //         suggestionsBox.style.display = "none";
    //       };
    //       suggestionsBox.appendChild(div);
    //     });
    //     // Position suggestions below the input
    //     updateSuggestionsBoxPosition(input, suggestionsBox);
    //     suggestionsBox.style.display = "block";
    //   });

    //   window.addEventListener(
    //     "scroll",
    //     () => updateSuggestionsBoxPosition(input, suggestionsBox),
    //     true
    //   );
    //   window.addEventListener("resize", () =>
    //     updateSuggestionsBoxPosition(input, suggestionsBox)
    //   );

    //   // Hide suggestions on blur/click outside
    //   input.addEventListener("blur", function () {
    //     setTimeout(() => {
    //       suggestionsBox.style.display = "none";
    //     }, 200);
    //   });
    // }
    // else if (colType === "dropdown") {
    //   getSchema().then((schema) => {
    //     const options =
    //       schema["$defs"]?.[dataType]?.properties?.[col]?.enum || [];
    //     const select = document.createElement("select");
    //     select.className = "add-row-dropdown-select";
    //     select.name = "selectElement";
    //     select.setAttribute("data-col", col);
    //     select.setAttribute("data-type", dataType);
    //     select.setAttribute("data-coltype", "dropdown");
    //     select.innerHTML =
    //       '<option value="">Select...</option>' +
    //       options
    //         .map((opt) => `<option value="${opt}">${opt}</option>`)
    //         .join("");
    //     // Replace the input with the select
    //     if (input) {
    //       input.style.display = "none";
    //     }
    //     container.appendChild(select);

    //     // On change, update addRowTags or values as needed
    //     select.addEventListener("change", function () {
    //       addRowTags[col] = [select.value];
    //       console.log("Selected value:", select.value);
    //     });
    //   });
    // }
    // Add tag on Enter
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && input.value.trim() !== "") {
        e.preventDefault();
        const tag = input.value.trim();

        // ✅ Check if this field is email column
        if (col === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(tag)) {
            // alert("Please enter a valid Email address.");
            showToast("Please enter a valid Email address.", "error");
            input.value = "";
            return;
          }
        }

        // if (colType === "tagging_autocomplete") {
        //   if (autocompleteSource.includes(tag)) {
        //     if (!addRowTags[col].includes(tag)) {
        //       addRowTags[col].push(tag);

        //       // Create tag element
        //       const span = document.createElement("span");
        //       span.className = "tag";
        //       span.setAttribute("data-tag", tag);
        //       span.innerHTML =
        //         tag +
        //         ' <span class="remove-tag" data-tag="' +
        //         tag +
        //         '">×</span>';
        //       container.insertBefore(span, input);
        //     }
        //     input.value = "";
        //     if (suggestionsBox) suggestionsBox.style.display = "none";
        //   } else {
        //     showInvalidTagMessage(
        //       container,
        //       input,
        //       "Please select a value from the list."
        //     );
        //     input.classList.add("invalid");
        //     setTimeout(() => input.classList.remove("invalid"), 1000);
        //     input.value = "";
        //   }
        // }
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
        // else {

        // }
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
  document.querySelectorAll("table.auto-property").forEach(function (table) {
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

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();

      const activeElement = document.activeElement;

      if (activeElement.classList.contains("checkbox-element")) {
        activeElement.checked = !activeElement.checked; // toggle
      }
      if (activeElement.classList.contains("add-row-btn")) {
        activeElement.click();
      }
    }
  });

  highlightEmptyAddRowControls();

  // deleteRow and MergeRow
  const deleteIcon = document.querySelector(".action .delete-row-btn");
  const mergeRowIcon = document.querySelector(".action .fa-table-list");
  const deleteRowConfirm = document.querySelector(".action .delete-row");
  const mergeRowConfirm = document.querySelector(".action .merge-row");

  // ✅ Use event delegation for checkbox handling
  document.addEventListener("change", function (e) {
    if (e.target.classList.contains("checkbox-select")) {
      const checkbox = e.target;
      const row = checkbox.closest("tr");

      // Highlight selected row
      if (checkbox.checked) {
        row.classList.add("table-secondary");
      } else {
        row.classList.remove("table-secondary");
      }

      // Count selected checkboxes
      const selectedCount = document.querySelectorAll(
        ".checkbox-select:checked"
      ).length;

      // Show/hide icons based on selection count
      deleteIcon.style.display = selectedCount >= 1 ? "" : "none";
      mergeRowIcon.style.display = selectedCount >= 2 ? "" : "none";
    }
  });

  // ✅ Handle delete icon click
  deleteIcon.addEventListener("click", function () {
    deleteRowConfirm.style.display = "";
    deleteIcon.style.display = "none";
    mergeRowIcon.style.display = "none";
  });

  // ✅ Handle merge icon click
  mergeRowIcon.addEventListener("click", function () {
    mergeRowConfirm.style.display = "";
    deleteIcon.style.display = "none";
    mergeRowIcon.style.display = "none";
  });

  // ✅ Handle delete confirmation (YES button)
  document.querySelector(".deleteRow").addEventListener("click", function () {
    const selectedCheckboxes = document.querySelectorAll(
      ".checkbox-select:checked"
    );

    selectedCheckboxes.forEach((checkbox) => {
      const row = checkbox.closest("tr");
      const table = row.closest("table");

      if (row) row.remove();

      // Update hidden input for that table
      if (table && table.id && table.id.endsWith("Table")) {
        const key = table.id.replace(/Table$/, "");
        if (typeof updateTableHiddenInput === "function") {
          updateTableHiddenInput(key);
        }
      }
    });
    if (selectedCheckboxes.length >= 2) {
      showToast("Selected Rows have been deleted", "success");
    } else showToast("Selected Row has been deleted", "success");
    // Hide confirmation prompt
    deleteRowConfirm.style.display = "none";

    // Reset icons
    deleteIcon.style.display = "none";
    mergeRowIcon.style.display = "none";
  });

  // ✅ Handle merge confirmation (YES button)
  document.querySelector(".mergeRow").addEventListener("click", function () {
    const selectedCheckboxes = document.querySelectorAll(
      ".checkbox-select:checked"
    );

    const firstRow = selectedCheckboxes[0].closest("tr");
    const table = firstRow.closest("table");
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
      th.getAttribute("data-col")
    );

    const givenNameIdx = headers.indexOf("givenName");
    const familyNameIdx = headers.indexOf("familyName");
    const emailIdx = headers.indexOf("email");

    // 🔹 Extract data for all selected rows
    const selectedData = Array.from(selectedCheckboxes).map((checkbox) => {
      const row = checkbox.closest("tr");
      const cells = row.querySelectorAll("td");

      const givenName = cells[givenNameIdx]?.textContent.trim() || "";
      const familyName = cells[familyNameIdx]?.textContent.trim() || "";

      // Collect all emails (from tags if available)
      let emails = [];
      if (emailIdx !== -1) {
        const emailCell = cells[emailIdx];
        const tags = emailCell.querySelectorAll(".tag");
        if (tags.length > 0) {
          emails = Array.from(tags).map((t) => t.dataset.tag);
        } else if (emailCell.textContent.trim() !== "") {
          emails = [emailCell.textContent.trim()];
        }
      }

      return { row, givenName, familyName, emails };
    });

    // 🔹 Group selected rows by Given Name + Family Name
    const grouped = {};
    selectedData.forEach((item) => {
      const key = `${item.givenName.toLowerCase()}-${item.familyName.toLowerCase()}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    let merged = false;

    // 🔹 Merge logic for rows with same Given + Family
    Object.values(grouped).forEach((group) => {
      if (group.length > 1) {
        merged = true;
        const mainRow = group[0].row; // keep first row
        const allEmails = [...new Set(group.flatMap((g) => g.emails))]; // merge + dedupe

        // Update mainRow's email cell
        if (emailIdx !== -1) {
          const emailCell = mainRow.querySelectorAll("td")[emailIdx];
          const tagsList = emailCell.querySelector(".tags-list");

          if (tagsList) {
            tagsList.innerHTML = "";
            allEmails.forEach((email) => {
              const span = document.createElement("span");
              span.className = "tag";
              span.setAttribute("data-tag", email);
              span.innerHTML =
                email +
                ' <span class="remove-tag" data-tag="' +
                email +
                '">×</span>';
              tagsList.appendChild(span);
            });
          } else {
            emailCell.textContent = allEmails.join(", ");
          }
        }

        // Remove other duplicate rows
        group.slice(1).forEach((g) => g.row.remove());
      }
    });

    // ✅ Update hidden input JSON
    if (table && typeof updateTableHiddenInput === "function") {
      const key = table.id.replace(/Table$/, "");
      updateTableHiddenInput(key);
    }

    // ✅ UI cleanup
    mergeRowConfirm.style.display = "none";
    deleteIcon.style.display = "none";
    mergeRowIcon.style.display = "none";
    selectedCheckboxes.forEach((cb) => (cb.checked = false));
    table
      .querySelectorAll("tr")
      .forEach((row) => row.classList.remove("table-secondary"));

    if (merged) {
      showToast(
        "Rows with matching names have been merged successfully!",
        "success"
      );
    } else {
      showToast(
        "No matching Given Name + Family Name found among selected rows.",
        "error"
      );
    }
  });
  // removeSelectColumn("copyrightHolderTable");
  removeColumnFromTable("copyrightHolderTable", "select");
  // removeColumnFromTable("contributorTable", "Row Control");
}

// Add function to color add items when element is required or recommended and empty
export function highlightEmptyAddRowControls() {
  getSchema().then((schema) => {
    const { required, recommended } = fetchRequiredAndRecommendedFields(schema);
    const allMandatory = [...required, ...recommended];

    document.querySelectorAll("table.auto-property").forEach((table) => {
      const tableId = table.id;
      if (!tableId || !tableId.endsWith("Table")) return;
      const key = tableId.replace(/Table$/, "");

      // Find the corresponding add-row-controls
      const addRowControls = document.querySelector(
        `.add-row-controls[data-table-key="${key}"]`
      );
      if (!addRowControls) return;

      addRowControls.classList.remove(
        "invalid-required",
        "invalid-recommended"
      );

      const tbody = table.querySelector("tbody");
      const dataRows = tbody
        ? Array.from(tbody.querySelectorAll("tr")).filter(
            (row) => !row.classList.contains("add-row-controls")
          )
        : [];

      if (required.includes(key) && dataRows.length === 0) {
        addRowControls.classList.add("invalid-required");
      } else if (recommended.includes(key) && dataRows.length === 0) {
        addRowControls.classList.add("invalid-recommended");
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

    const col = cell.getAttribute("data-col");
    const colType = cell.getAttribute("data-coltype");
    const dataType = cell.getAttribute("data-type");

    // if (colType == "tagging_autocomplete") {
    //   // getSchema().then((schema) => {
    //   //   autocompleteSource =
    //   //     schema["$defs"]?.[dataType]?.properties?.[col]?.items?.enum || [];
    //   //   if (autocompleteSource.length > 0) {
    //   //     setupTableTagAutocomplete({ cell, autocompleteSource });
    //   //   }
    //   // });
    // } else
    // if (colType === "dropdown") {
    //   const currentValue =
    //     cell.getAttribute("data-value") || cell.textContent.trim() || "";
    //   cell.innerHTML = "";
    //   cell.textContent = currentValue;

    //   // cell.addEventListener("click", function handleDropdownCellClick(e) {
    //   //   if (cell.querySelector("select")) return;
    //   //   getSchema().then((schema) => {
    //   //     const options =
    //   //       schema["$defs"]?.[dataType]?.properties?.[col]?.enum || [];
    //   //     const select = document.createElement("select");
    //   //     select.className = "table-dropdown-select";
    //   //     select.name = "ChangingSelect";
    //   //     select.innerHTML =
    //   //       '<option value="">Select...</option>' +
    //   //       options
    //   //         .map((opt) => `<option value="${opt}">${opt}</option>`)
    //   //         .join("");
    //   //     select.value = currentValue;

    //   //     cell.innerHTML = "";
    //   //     cell.appendChild(select);
    //   //     select.focus();

    //   //     function finalizeSelection() {
    //   //       const selectedValue = select.value;
    //   //       cell.setAttribute("data-value", selectedValue);
    //   //       setTimeout(() => {
    //   //         cell.innerHTML = selectedValue;
    //   //       }, 0);

    //   //       cell.removeEventListener("click", handleDropdownCellClick);
    //   //       setTimeout(() => {
    //   //         cell.addEventListener("click", handleDropdownCellClick);
    //   //       }, 0);

    //   //       const table = cell.closest("table");
    //   //       if (table && table.id.endsWith("Table")) {
    //   //         const key = table.id.replace(/Table$/, "");
    //   //         updateTableHiddenInput(key);
    //   //       }
    //   //     }

    //   //     select.addEventListener("change", finalizeSelection);
    //   //     select.addEventListener("blur", finalizeSelection);
    //   //   });

    //   //   cell.removeEventListener("click", handleDropdownCellClick);
    //   // });

    //   return;
    // }

    // Show input when cell is clicked
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

        // ✅ Email Validation
        if (col === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(tag)) {
            showToast("Please enter a valid Email address.", "error");
            input.value = "";
            return; // ❌ Stop tag creation
          }
        }

        if (
          [...tagsList.querySelectorAll(".tag")].some(
            (t) => t.textContent.trim() === tag + "×"
          )
        ) {
          input.value = "";
          return;
        }

        // let autocompleteSource = [];
        // const colType = cell.getAttribute("data-coltype");
        // if (colType === "tagging_autocomplete") {
        //   getSchema().then((schema) => {
        //     autocompleteSource =
        //       schema["$defs"]?.[dataType]?.properties?.[col]?.items?.enum || [];
        //     if (!autocompleteSource.includes(tag)) {
        //       alert("Please select a value from the list.");
        //       input.value = "";
        //       return;
        //     }
        //   });
        // }

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

    // Remove tag on click
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

function removeColumnFromTable(tableId, columnName) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const headers = Array.from(table.querySelectorAll("thead th"));
  const headerIndex = headers.findIndex(
    (th) => th.textContent.trim().toLowerCase() === columnName.toLowerCase()
  );

  // If header not found, stop
  if (headerIndex === -1) return;

  // 🔹 Remove the header cell
  headers[headerIndex].remove();

  // 🔹 Remove the corresponding <td> in each row (same index)
  table.querySelectorAll("tbody tr").forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells[headerIndex]) {
      cells[headerIndex].remove();
    }
  });
}
