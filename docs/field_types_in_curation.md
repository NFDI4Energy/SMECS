# Functionalities for Displaying Metadata Elements in SMECS

SMECS supports typical field types in the curation interface. The following types are generally supported:

## Regular Elements
* Regular elements include one string/number of information

### Single Inputs
* tag: single_inputs_
* half page field for simple text
* Typical used for:
     * Cardinality: 1
     * Type: string, number, etc.

### Long Field
* tag: long_field
* full page field for longer text
* Typical used for:
     * Cardinality: 1
     * Type: string

### Dropdown
* tag: dropdown
* full page dropdown field
* loads a list of allowed values from schema file
* Typical used for:
     * Cardinality: 1
     * Type: string
     * Enum list is available

### Tagging
* tag: tagging
* full page field for multiple simple strings
* each string can be added with enter
* each existing string can be deleted
* Typical used for:
     * Cardinality: n
     * Type: string, number, etc.

### TaggingDropdown
* tag: tagging_dropdown
* tagging with a dropdown list for each element
* useful for short enum lists
* loads a list of allowed values from schema file for dropdown
* Typical used for:
     * Cardinality: n
     * Type: string
     * Short enum list
     * Enum list is available
* Status: not nicely implemented

### TaggingAutocomplete
* tag: taggingAutocomplete
* tagging but with autocompletion for each element
* useful is the enum list is long
* loads a list of allowed values from schema file for auto completion
* Typical used for:
     * Cardinality: n
     * Type: string
     * Long enum list
     * Enum list is available

### Hidden
* tag: hidden
* elements which should not be shown in frontend
* elements remain in metadata

## Tables for Nested Elements
When an element consists of a type which includes multiple sub-types, a table is required. There are different types:

### Nested Elements with one subelement
* tag: array of the tags of the subelements
* The value is stored as subvalue while shown as normal value
* Status: not nicely implemented

### Small Table
* tag: array of the tags of the subelements
* The table takes the full width but is placed within the normal information overview
* A small table has up 2-4 columns.
* Allowed column values are simpleField, Tagging, and dropdown
* Status: not nicely implemented

### Specific Tables
* tag: use specific tags here!
* Specific tables are a separat tab and include more columns
* Often the information here can be linked to different metadata elements (e.g., author and contributor or input and output)
* The following table are required: person, funding, interface
* The table need to support the following types: SimpleField, Tagging, TaggingAutocomplete, smallTable, checkbox

#### Checkbox
* A checkbox indicates a boolean property in a table
