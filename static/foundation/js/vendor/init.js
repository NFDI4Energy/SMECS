// init.js

import { setupForm } from "./form-utils.js";
import { initializeTaggingFields } from "./tagging.js";
import { setupTables } from "./table-utils.js";
import { setupDownload } from "./download.js";
import { setupUI, loadpage, initCaptcha, setupInputSourceToggle } from "./ui.js";
import { initializeDynamicDropdowns } from "./dropdown-utils.js";
import { setMandatoryFieldsFromSchema } from "./schema-utils.js";
// Entry point: called when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Core page controls work for every curation schema. Register them before
  // the CodeMeta-specific form, table, dropdown, and schema initializers.
  setupUI();
  setupForm();
  setupDownload();
  initCaptcha();
  loadpage();
  setupInputSourceToggle();
  initializeTaggingFields();
  setupTables();
  initializeDynamicDropdowns();
  setMandatoryFieldsFromSchema();
});
