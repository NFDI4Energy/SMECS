// src/tableUtils.js
// Table row add/remove and hidden-input sync

import { createSuggestionsBox, setupTagging } from './tagging.js';
import { JsonSchemaUrl } from './schema.js';

/** Extract cell value based on type */
export function extractCellValue(cell, coltype) {
    if (coltype === 'checkbox') 
        return cell.querySelector('input').checked;
    if (coltype === 'dropdown') 
        return cell.querySelector('select').value;
    if (coltype === 'tagging' || coltype === 'tagging_autocomplete') 
        return cell.querySelector('input').value;
    return cell.textContent.trim();
}

/** Update hidden input for a table */
export function updateTableHiddenInput(key) {
    const table       = document.getElementById(key + 'Table');
    const hiddenInput = document.getElementById(key + 'TableHiddenInput');
    if (!table || !hiddenInput) return;

    const atType  = table.dataset.atType;
    const headers = Array.from(table.querySelectorAll('thead th'))
        .map(th => ({ name: th.dataset.col, coltype: th.dataset.coltype }));

    // Prepare a container for arrays of elements
    const data = {};
    headers
      .filter(h => h.coltype === 'element')
      .forEach(h => { data[h.name] = []; });

    // Build objects from each row
    Array.from(table.querySelectorAll('tbody tr'))
         .filter(row => !row.classList.contains('add-row-controls'))
         .forEach(row => {
            const cells = Array.from(row.cells);
            const obj = { '@type': atType };
            headers
              .filter(h => h.coltype !== 'element' && h.coltype !== 'delete')
              .forEach((h, i) => {
                  obj[h.name] = extractCellValue(cells[i], h.coltype);
              });
            headers
              .filter(h => h.coltype === 'element')
              .forEach(h => {
                  data[h.name].push(obj);
              });
         });

    // Merge into metadata JSON
    const meta = JSON.parse(document.getElementById('metadata-json').value);
    Object.keys(data).forEach(k => meta[k] = data[k]);
    document.getElementById('metadata-json').value = JSON.stringify(meta, null, 2);
}

/** Initialize add-row controls and tagging in tables */
export function initializeTableTaggingCells() {
    // --- Row addition buttons ---
    document.querySelectorAll('.add-row-controls').forEach(ctrl => {
        const addButton = ctrl.querySelector('button.add-row');
        if (!addButton) return;                // ← guard to avoid null
        addButton.addEventListener('click', () => {
            const tableId = ctrl.dataset.for;
            const table   = document.getElementById(tableId + 'Table');
            const newRow  = table.insertRow(table.rows.length - 1);

            // Clone each input/select from the controls row into the new row
            Array.from(ctrl.querySelectorAll('input, select'))
                 .forEach((inp, i) => {
                     const cell = newRow.insertCell(i);
                     cell.appendChild(inp.cloneNode());
                 });

            updateTableHiddenInput(tableId);
        });
    });

    // --- Initialize tagging/autocomplete in table cells ---
    document.querySelectorAll('table.auto-property-table td').forEach(cell => {
        const coltype = cell.dataset.coltype;
        if (coltype === 'tagging_autocomplete') {
            fetch(JsonSchemaUrl)
                .then(r => r.json())
                .then(schema => {
                    const key  = cell.dataset.col;
                    const list = schema.properties?.[key]?.items?.enum || [];
                    setupTagging({
                        containerId:    cell.id + 'Tags',
                        hiddenInputId:  cell.id + 'HiddenInput',
                        inputId:        cell.id + 'Input',
                        useAutocomplete: true,
                        autocompleteSource: list,
                        jsonKey:        key
                    });
                });
        }
    });
}
