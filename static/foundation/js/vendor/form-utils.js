// form-utils.js
/*Handles all form input behaviors, including:
    1) Real-time validation against the schema
    2) Syncing form fields to the JSON textarea
    3) Filling form fields from existing metadata*/

import { validateInput } from "./ui.js";

const metadataJson = document.getElementById("metadata-json");
const inputs = document.querySelectorAll(
  "#metadata-form input, #metadata-form select, #metadata-form textarea"
);

export function setupForm() {
  const form = document.getElementById("metadata-form");
  if (form?.dataset.schemaType === "connoss") {
    setupConnossRequiredFields(form);
    setupConnossPeopleTable(form);
    // ConnOSS values can be lists, booleans, dates, or nested JSON objects.
    const syncConnossField = (event) => {
      const input = event.target;
      if (input.closest(".connoss-people-table")) {
        syncConnossPeople(form);
        return;
      }
      if (!input.matches("input, textarea, select")) {
        return;
      }
      if (input.closest(".tagging-wrapper")) {
        updateConnossRequiredField(form, input.name);
        return;
      }
      handleInputChange(input);
      updateConnossRequiredField(form, input.name);
    };
    form.addEventListener("input", syncConnossField);
    form.addEventListener("change", syncConnossField);
    form.addEventListener("click", (event) => {
      if (event.target.matches(".connoss-add-person")) {
        event.preventDefault();
        const body = form.querySelector(".connoss-people-table tbody");
        if (!body) return;
        const emptyNewRow = [...body.querySelectorAll('tr[data-new-person="true"]')]
          .find((row) => isConnossPersonRowEmpty(row));
        if (emptyNewRow) {
          emptyNewRow.querySelector('[data-person-field="@id"]')?.focus();
          return;
        }
        const row = document.createElement("tr");
        row.dataset.person = JSON.stringify({ "@type": "Person" });
        row.dataset.newPerson = "true";
        row.innerHTML = `
          <td><input class="connoss-person-select" type="checkbox" aria-label="Select person"></td>
          <td><input data-person-field="@id"></td>
          <td><input data-person-field="givenName"></td>
          <td><input data-person-field="familyName"></td>
          ${connossTagCell("email", "Add email and press Enter")}
          <td><input data-person-field="account.url"></td>
          <td><input data-person-field="url"></td>
          ${connossTagCell("affiliation", "Add affiliation and press Enter")}
          <td><input data-person-role="author" type="checkbox"></td>
          <td><input data-person-role="contributor" type="checkbox"></td>`;
        body.appendChild(row);
        row.querySelector('[data-person-field="@id"]')?.focus();
      }
    });
    return;
  }

  inputs.forEach((input) => validateInput(input));
  inputs.forEach((input) => {
    input.addEventListener("input", () => handleInputChange(input));
    input.addEventListener("change", () => handleInputChange(input));
  });
}

function connossRequiredProperties(form) {
  return (form.dataset.requiredProperties || "").split(",").filter(Boolean);
}

function setupConnossRequiredFields(form) {
  connossRequiredProperties(form).forEach((key) => {
    const field = form.querySelector(`[name="${key}"]`);
    const label = form.querySelector(`label[for="${key}"], .tagging-label[for="${key}Input"]`);
    if (label && !label.querySelector(".asterisk")) {
      const star = document.createElement("span");
      star.className = "asterisk";
      star.textContent = " *";
      label.appendChild(star);
    }
    updateConnossRequiredField(form, key, field);
  });
}

function updateConnossRequiredField(form, key, suppliedField = null) {
  if (!connossRequiredProperties(form).includes(key) || !metadataJson) return;
  const field = suppliedField || form.querySelector(`[name="${key}"]`);
  const value = JSON.parse(metadataJson.value)[key];
  const empty = value === null || value === undefined || value === "" ||
    (Array.isArray(value) && value.length === 0);
  const target = field?.closest(".tagging-wrapper") || field;
  if (target) target.classList.toggle("connoss-required-empty", empty);
}

function syncConnossPeople(form) {
  const table = form.querySelector(".connoss-people-table");
  if (!table || !metadataJson) return;
  const jsonObject = JSON.parse(metadataJson.value);
  const authors = [];
  const contributors = [];

  table.querySelectorAll("tbody tr").forEach((row) => {
    let person;
    try {
      person = JSON.parse(row.dataset.person || "{}");
    } catch {
      person = {};
    }
    delete person.author_role;
    delete person.contributor_role;
    person["@type"] = person["@type"] || "Person";
    row.querySelectorAll("[data-person-field]").forEach((element) => {
      const field = element.dataset.personField;
      if (element.classList.contains("connoss-tag-cell")) {
        const tags = connossCellTags(element);
        if (tags.length) person[field] = tags;
        else delete person[field];
      } else if (field === "account.url") {
        const accountUrl = element.value.trim();
        if (accountUrl) person.account = { ...(person.account || {}), url: accountUrl };
        else if (person.account) {
          delete person.account.url;
          if (Object.keys(person.account).length === 0) delete person.account;
        }
      } else if (element.value.trim()) person[field] = element.value.trim();
      else delete person[field];
    });
    if (row.querySelector('[data-person-role="author"]')?.checked) authors.push({ ...person });
    if (row.querySelector('[data-person-role="contributor"]')?.checked) contributors.push({ ...person });
  });
  jsonObject.author = authors;
  jsonObject.contributor = contributors;
  metadataJson.value = JSON.stringify(jsonObject, null, 2);
}

function connossTagCell(field, placeholder) {
  const type = field === "email" ? ' type="email"' : "";
  return `<td class="connoss-tag-cell" data-person-field="${field}"><div class="connoss-tags tags-list"></div><input class="connoss-tag-input"${type} placeholder="${placeholder}"></td>`;
}

function connossCellTags(cell) {
  return [...cell.querySelectorAll(".connoss-tag")].map((tag) => tag.dataset.value).filter(Boolean);
}

function isConnossPersonRowEmpty(row) {
  const hasText = [...row.querySelectorAll("[data-person-field]")].some((element) =>
    element.classList.contains("connoss-tag-cell")
      ? connossCellTags(element).length > 0
      : Boolean(element.value.trim()),
  );
  const hasRole = [...row.querySelectorAll("[data-person-role]")].some((input) => input.checked);
  return !hasText && !hasRole;
}

function addConnossTag(cell, value) {
  const clean = value.trim();
  if (!clean || connossCellTags(cell).some((tag) => tag.toLowerCase() === clean.toLowerCase())) return false;
  if (cell.dataset.personField === "email") {
    const validator = document.createElement("input");
    validator.type = "email";
    validator.value = clean;
    if (!validator.checkValidity()) return false;
  }
  const tag = document.createElement("span");
  tag.className = "connoss-tag tag";
  tag.dataset.value = clean;
  tag.append(document.createTextNode(`${clean} `));
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "connoss-remove-tag";
  remove.setAttribute("aria-label", `Remove ${clean}`);
  remove.textContent = "×";
  tag.append(remove);
  cell.querySelector(".connoss-tags").append(tag);
  return true;
}

function setupConnossPeopleTable(form) {
  const table = form.querySelector(".connoss-people-table");
  const actions = form.querySelector(".connoss-people-actions");
  if (!table || !actions) return;
  const deleteButton = actions.querySelector(".connoss-delete-selected");
  const mergeButton = actions.querySelector(".connoss-merge-selected");
  const confirmation = actions.querySelector(".connoss-people-confirm");
  const selectedRows = () => [...table.querySelectorAll("tbody tr")].filter((row) => row.querySelector(".connoss-person-select")?.checked);
  const refreshActions = () => {
    const count = selectedRows().length;
    deleteButton.hidden = count === 0;
    mergeButton.hidden = count < 2;
    table.querySelectorAll("tbody tr").forEach((row) => row.classList.toggle("table-secondary", row.querySelector(".connoss-person-select")?.checked));
  };
  const confirm = (message, action) => {
    confirmation.hidden = false;
    confirmation.replaceChildren(document.createTextNode(`${message} `));
    const yes = document.createElement("button"); yes.type = "button"; yes.textContent = "Yes";
    const no = document.createElement("button"); no.type = "button"; no.textContent = "No";
    yes.addEventListener("click", () => { action(); confirmation.hidden = true; refreshActions(); syncConnossPeople(form); });
    no.addEventListener("click", () => { confirmation.hidden = true; });
    confirmation.append(yes, no);
  };
  table.addEventListener("change", refreshActions);
  table.addEventListener("focusout", (event) => {
    if (!event.target.matches('[data-person-field="givenName"], [data-person-field="familyName"]')) return;
    setTimeout(() => {
      mergeConnossPeople([...table.querySelectorAll("tbody tr")]);
      syncConnossPeople(form);
    }, 0);
  });
  table.addEventListener("focusout", (event) => {
    const row = event.target.closest('tr[data-new-person="true"]');
    if (!row) return;
    // Wait for the next focused element so moving within a row does not remove it.
    setTimeout(() => {
      if (!row.contains(document.activeElement) && isConnossPersonRowEmpty(row)) {
        row.remove();
        refreshActions();
        syncConnossPeople(form);
      }
    }, 0);
  });
  table.addEventListener("keydown", (event) => {
    if (event.target.matches(".connoss-tag-input") && event.key === "Enter") {
      event.preventDefault();
      const cell = event.target.closest(".connoss-tag-cell");
      if (addConnossTag(cell, event.target.value)) {
        event.target.value = "";
        event.target.setCustomValidity("");
        syncConnossPeople(form);
      } else if (cell.dataset.personField === "email" && event.target.value.trim()) {
        event.target.setCustomValidity("Enter a valid email address.");
        event.target.reportValidity();
      }
    }
  });
  table.addEventListener("click", (event) => {
    const remove = event.target.closest(".connoss-remove-tag");
    if (remove) { remove.closest(".connoss-tag").remove(); syncConnossPeople(form); }
  });
  deleteButton.addEventListener("click", () => confirm(`Delete ${selectedRows().length} selected person(s)?`, () => selectedRows().forEach((row) => row.remove())));
  mergeButton.addEventListener("click", () => confirm("Merge selected rows with identical given and family names?", () => mergeConnossPeople(selectedRows())));
  // Consolidate duplicate people supplied by different metadata sources on load.
  mergeConnossPeople([...table.querySelectorAll("tbody tr")]);
  syncConnossPeople(form);
}

function mergeConnossPeople(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const givenInput = row.querySelector('[data-person-field="givenName"]');
    const familyInput = row.querySelector('[data-person-field="familyName"]');
    const given = givenInput?.value.trim().replace(/[,;]+$/, "").trim() || "";
    const family = familyInput?.value.trim().replace(/^[,;]+|[,;]+$/g, "").trim() || "";
    if (givenInput) givenInput.value = given;
    if (familyInput) familyInput.value = family;
    if (!given && !family) return;
    const key = `${given.toLocaleLowerCase()}|${family.toLocaleLowerCase()}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  });
  groups.forEach((group) => {
    if (group.length < 2) return;
    const main = group[0];
    ["@id", "url", "account.url", "identifier"].forEach((field) => {
      const target = main.querySelector(`[data-person-field="${field}"]`);
      if (!target) return;
      const values = [target.value.trim(), ...group.slice(1).map((row) => row.querySelector(`[data-person-field="${field}"]`)?.value.trim())].filter(Boolean);
      target.value = [...new Set(values)].join(", ");
    });
    ["email", "affiliation"].forEach((field) => {
      const target = main.querySelector(`.connoss-tag-cell[data-person-field="${field}"]`);
      group.slice(1).forEach((row) => row.querySelectorAll(`.connoss-tag-cell[data-person-field="${field}"] .connoss-tag`).forEach((tag) => addConnossTag(target, tag.dataset.value)));
    });
    ["author", "contributor"].forEach((role) => main.querySelector(`[data-person-role="${role}"]`).checked = group.some((row) => row.querySelector(`[data-person-role="${role}"]`).checked));
    group.slice(1).forEach((row) => row.remove());
  });
}

// function handleInputChange(input) {
//   validateInput(input);
//   const jsonObject = JSON.parse(metadataJson.value);
//   const key = input.name.split("[")[0];
//   const subkey = input.name.split("[")[1]?.split("]")[0];
//   const excludedInputs = [];
//   // Collect all IDs of single input objects
//   const singleInputObjectIds = Array.from(
//     document.querySelectorAll("input[data-single-input-object]")
//   )
//     .map((input) => input.name) // or .id, depending on what you want to exclude by
//     .filter((id) => id); // Filter out inputs without a name/id

//   // Collect all IDs of single input in tables
//   const singleInputTableIds = Array.from(
//     document.querySelectorAll(
//       ".auto-property-table input, .auto-property-table select, .auto-property-table textarea"
//     )
//   );
//   excludedInputs.push(...singleInputObjectIds, ...singleInputTableIds);
//   const addRowFields = document.querySelectorAll('[data-add-row="true"]');
//   const addRowFieldNames = Array.from(addRowFields)
//     .map((field) => field.name)
//     .filter(Boolean);
//   excludedInputs.push(...addRowFieldNames);

//   //Skip inputs inside [key]Tags divs
//   const parentDiv = input.closest("div");
//   const isInsideTagsDiv =
//     parentDiv && parentDiv.id && parentDiv.id.endsWith("Tags");
//   if (isInsideTagsDiv) return;

//   if (!isInTable(input) && !isInAddRowControls(input)) {
//     if (!excludedInputs.includes(input.name)) {
//       if (subkey) {
//         if (!jsonObject[key]) jsonObject[key] = {}; // make sure key exists
//         jsonObject[key][subkey] = input.value;
//       } else {
//         jsonObject[key] = input.value;
//       }
//     }

//     metadataJson.value = JSON.stringify(jsonObject, null, 2);
//   }
// }

function handleInputChange(input) {
  const jsonObject = JSON.parse(metadataJson.value);
  const key = input.dataset.jsonKey || input.name;

  if (input.closest(".tagging-wrapper")) {
    return;
  }

  if (input.type === "checkbox") {
    jsonObject[key] = input.checked;
  } else if (input.dataset.fieldType === "object") {
    try {
      jsonObject[key] = input.value.trim() ? JSON.parse(input.value) : null;
    } catch {
      // Keep incomplete edits visible without preventing continued curation.
      jsonObject[key] = input.value;
    }
  } else if (input.dataset.fieldType === "tagging") {
    return;
  } else {
    jsonObject[key] = input.value;
  }

  metadataJson.value = JSON.stringify(jsonObject, null, 2);
}

function isInTable(element) {
  return !!element.closest("table");
}

function isInAddRowControls(element) {
  return !!element.closest(".add-row-controls");
}
