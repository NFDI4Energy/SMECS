// src/init.js
// Main bootstrap

import { setMandatoryFieldsFromSchema } from './schema.js';
import { validateMandatoryFields } from './schema.js';
import { initializeTaggingFields, setupSingleInputObject } from './tagging.js';
import { initializeTableTaggingCells, updateTableHiddenInput } from './tableUtils.js';
import { DynamicDropdown } from './dropdown.js';
import { showPopup, checkAndShowPopup, setupTabs, setupNavButtons, toggleSection } from './popup.js';
import { downloadFile } from './download.js';

// Wire up on DOMContentLoaded
export function init() {
    document.addEventListener('DOMContentLoaded', () => {
        setMandatoryFieldsFromSchema();
        initializeTaggingFields();
        document.querySelectorAll('.single-input-object-label[data-single-input-object]').forEach(label => {
            const key = label.dataset.singleInputObject;
            setupSingleInputObject({
                containerId: key+'Object', hiddenInputId:key+'HiddenInput', inputId:key+'Input', jsonKey:key
            });
        });
        document.querySelectorAll('table.auto-property-table').forEach(table=>{
            const key=table.id.replace(/Table$/, ''); updateTableHiddenInput(key);
        });
        initializeTableTaggingCells();
        document.querySelectorAll('select[data-dropdown-schema]').forEach(dd=>{
            new DynamicDropdown(dd.id, dd.dataset.dropdownSchema).populateDropdown();
        });
        setupTabs(document.querySelectorAll('.tab-links_ext a'), document.querySelectorAll('.tab-content_ext .tab'));
        setupNavButtons();
        checkAndShowPopup(window.location.hash, document.title);
        toggleSection();
        const ts=document.getElementById('toggleSwitch'); if(ts) ts.addEventListener('change', toggleSection);
        document.getElementById('copy-button')?.addEventListener('click', e=>{ e.preventDefault(); document.getElementById('metadata-json').select(); document.execCommand('copy'); });
        document.getElementById('downloadButton')?.addEventListener('click', downloadFile);
        document.getElementById('downloadBtn')?.addEventListener('click', downloadFile);
    });
}

init();