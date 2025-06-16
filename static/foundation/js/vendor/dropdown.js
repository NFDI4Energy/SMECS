// src/dropdown.js
// Dynamic dropdown population

import { JsonSchemaUrl } from './schema.js';

export class DynamicDropdown {
    constructor(dropdownId, schemaProperty) {
        this.dropdownId = dropdownId;
        this.schemaProperty = schemaProperty;
    }
    populateDropdown() {
        fetch(JsonSchemaUrl)
            .then(res=>res.json())
            .then(schema=>{
                const values = schema.properties?.[this.schemaProperty]?.enum||[];
                const dd = document.getElementById(this.dropdownId);
                if (!dd) return;
                dd.innerHTML = '<option value="">Select an option</option>';
                values.forEach(v=>{
                    const opt = document.createElement('option'); opt.value=v; opt.textContent=v; dd.appendChild(opt);
                });
            });
    }
}