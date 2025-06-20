// init.js

import { setupForm } from './form-utils.js';
import { initializeTaggingFields} from './tagging.js';
import { setupTables, highlightEmptyAddRowControls} from './table-utils.js';
import { setupDownload } from './download.js';
import { setupUI } from './ui.js';
import{ initializeDynamicDropdowns } from './dropdown-utils.js';
import {setMandatoryFieldsFromSchema} from './schema-utils.js';
// Entry point: called when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  highlightEmptyAddRowControls();
  setupForm();
  initializeTaggingFields();
  setupTables();
  setupDownload();
  setupUI();
  initializeDynamicDropdowns();
  setMandatoryFieldsFromSchema();
  
});
