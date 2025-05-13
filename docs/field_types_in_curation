# Functionalities for Displaying Metadata Elements in SMECS

SMECS supports typical field types in the curation interface. The following types are generally supported:

## Regular Elements
* Regular elements include one string/number of information

### Simple Field
* tag: simpleField
* half page field for simple text
* Typical used for:
     * Cardinality: 1
     * Type: string, number, etc.


### Long Field
* tag: longField
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

### TaggingAutocomplete
* tag: taggingAutocomplete
* tagging but with a dropdown menu for each string
* loads a list of allowed values from schema file
* Typical used for:
     * Cardinality: n
     * Type: string
     * Enum list is available

## Tables for Nested Elements
When an element consists of a type which includes multiple sub-types, a table is required. There are different types:

### Small Table
* tag: array of the tags of the subelements
* The table takes the full width but is placed within the normal information overview
* A small table has up 2-4 columns.
* Allowed column values are simpleField, Tagging, and dropdown

### Specific Tables
* tag: use specific tags here!
* Specific tables are a separat tab and include more columns
* Often the information here can be linked to different metadata elements (e.g., author and contributor or input and output)
* The following table are required: person, funding, interface
* The table need to support the following types: SimpleField, Tagging, TaggingAutocomplete, smallTable, checkbox

#### Checkbox
* A checkbox indicates a boolean property in a table
