// src/tagging.js
// Tagging and autocomplete for multi-value fields and single-object inputs

import { getFieldKey } from './utils.js';

/** Show invalid tag error */
function showInvalidTagMessage(container, input, message) {
    const msg = document.createElement('div');
    msg.className = 'invalid-tag-message';
    msg.textContent = message;
    container.appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
}

/** Update suggestions box position */
function updateSuggestionsBoxPosition(input, box) {
    const rect = input.getBoundingClientRect();
    Object.assign(box.style, {
        position: 'fixed',
        left: `${rect.left}px`, top: `${rect.bottom}px`,
        width: `${rect.width}px`
    });
}

/** Create empty suggestions box */
export function createSuggestionsBox(container) {
    const box = document.createElement('div');
    box.className = 'suggestions-box';
    container.appendChild(box);
    return box;
}

/** Core tagging initializer */
export function setupTagging({ containerId, hiddenInputId, inputId, suggestionsId = null, jsonKey, useAutocomplete = false, autocompleteSource = [] }) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const input = document.getElementById(inputId);
    const suggestionsBox = suggestionsId ? document.getElementById(suggestionsId) : createSuggestionsBox(container);
    const metadataJson = document.getElementById('metadata-json');

    let selectedTags = [];
    const label = document.querySelector(`.tagging-label[for="${inputId}"]`);
    const taggingType = label ? label.getAttribute('data-tagging-type') : null;
    const constantType = label ? label.getAttribute('data-constant-type') : null;

    if (taggingType === 'tagging_object') {
        try { selectedTags = JSON.parse(hiddenInput.value) || []; } catch { selectedTags = []; }
    } else {
        selectedTags = hiddenInput.value.split(',').map(v => v.trim()).filter(Boolean);
    }

    function renderTags() {
        container.querySelectorAll('.tag').forEach(t => t.remove());
        selectedTags.forEach(item => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            const value = taggingType === 'tagging_object' ? item.identifier : item;
            tag.dataset.value = value;
            tag.innerHTML = `${value}<span class="remove-tag" data-value="${value}">&times;</span>`;
            container.insertBefore(tag, input);
        });
    }

    function updateHidden() {
        hiddenInput.value = taggingType === 'tagging_object'
            ? JSON.stringify(selectedTags)
            : selectedTags.join(', ');
        const jsonObj = JSON.parse(metadataJson.value);
        jsonObj[jsonKey] = selectedTags;
        metadataJson.value = JSON.stringify(jsonObj, null, 2);
    }

    function addTag(tagValue) {
        if (!tagValue) return;
        if (taggingType === 'tagging_object') {
            if (!selectedTags.find(i => i.identifier === tagValue)) {
                selectedTags.push({ '@type': constantType || 'ScholarlyArticle', identifier: tagValue });
            }
        } else {
            if (!selectedTags.includes(tagValue)) {
                selectedTags.push(tagValue);
            }
        }
        renderTags(); updateHidden(); input.value = '';
        suggestionsBox.style.display = 'none';
    }

    // Initial render
    renderTags();

    if (useAutocomplete) {
        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            suggestionsBox.innerHTML = '';
            if (!query) return (suggestionsBox.style.display = 'none');
            const filtered = autocompleteSource.filter(tag =>
                tag.toLowerCase().startsWith(query) && !selectedTags.some(i => (taggingType==='tagging_object'?i.identifier:i) === tag)
            );
            if (filtered.length === 0) return (suggestionsBox.style.display = 'none');
            filtered.forEach(tag => {
                const div = document.createElement('div'); div.className='suggestion-item'; div.textContent = tag;
                div.onclick = () => addTag(tag);
                suggestionsBox.appendChild(div);
            });
            suggestionsBox.style.display = 'block';
            updateSuggestionsBoxPosition(input, suggestionsBox);
        });
    }

    // Remove tag
    container.addEventListener('click', e => {
        if (e.target.classList.contains('remove-tag')) {
            selectedTags = selectedTags.filter(i => (taggingType==='tagging_object'?i.identifier:i) !== e.target.dataset.value);
            e.target.parentElement.remove(); updateHidden();
        }
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault(); const val = input.value.trim();
            if (useAutocomplete && !autocompleteSource.includes(val)) {
                showInvalidTagMessage(container, input, 'Please select a value from the list.');
            } else addTag(val);
        }
    });
}

/** Initialize all tagging fields on page */
export function initializeTaggingFields() {
    document.querySelectorAll('.tagging-label[data-tagging]').forEach(label => {
        const key = label.getAttribute('data-tagging');
        const type = label.getAttribute('data-tagging-type');
        const setup = {
            containerId: key + 'Tags',
            hiddenInputId: key + 'HiddenInput',
            inputId: key + 'Input',
            suggestionsId: key + 'Suggestions',
            jsonKey: key,
            useAutocomplete: type === 'tagging_autocomplete',
            autocompleteSource: [] // will be fetched in init
        };
        setupTagging(setup);
    });
}

/** Single-object input helper */
export function setupSingleInputObject({ containerId, hiddenInputId, inputId, jsonKey }) {
    const input = document.getElementById(inputId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const metadataJson = document.getElementById('metadata-json');
    const label = document.querySelector(`.single-input-object-label[for="${inputId}"]`);
    const constantType = label ? label.getAttribute('data-single-input-object-type') : null;

    let obj = {};
    try { obj = JSON.parse(hiddenInput.value); } catch {}
    if (obj.identifier) input.value = obj.identifier;

    function updateObj() {
        const identifier = input.value.trim();
        const newObj = { '@type': constantType || 'ScholarlyArticle', identifier };
        hiddenInput.value = JSON.stringify(newObj);
        const jsonObj = JSON.parse(metadataJson.value);
        jsonObj[jsonKey] = newObj;
        metadataJson.value = JSON.stringify(jsonObj, null, 2);
    }

    input.addEventListener('input', updateObj);
    input.addEventListener('change', updateObj);
}
