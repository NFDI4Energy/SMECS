# Intilize curated metadata
# Within the file all relevant metadata elements for the curation page are defined

from django.conf import settings
import json
import os

def load_schema(schema_name: str) -> dict:
    schema_path = os.path.join(settings.BASE_DIR, 'static', 'schema', schema_name)
    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"Schema file '{schema_name}' not found at {schema_path}")
    except json.JSONDecodeError:
        raise ValueError(f"Schema file '{schema_name}' contains invalid JSON")
    return schema


# Load descriptions from the Schema
def load_description_dict_from_schema(schema: dict) -> dict[str, str]:
    properties = schema.get("properties", {})
    description_dict = {}

    for key, value in properties.items():
        if "description" in value:
            description_dict[key] = value["description"]

    return description_dict

# Define required field_type per element
def define_field_type(schema: dict) -> dict[str, str]:
    properties = schema.get("properties", {})
    type_dict = {}

    for key, value in properties.items():
        if key == "authors" or key == "contributors":
            type_dict[key] = "personTable"    
        elif "enum" in value:
            type_dict[key] = "dropdown"
        elif "$ref" in value: 
            type_dict[key] = "table"
        elif value.get("type") == "string":
            if key == "description":
                type_dict[key] = "longField"
            else:  
                type_dict[key] = "simpleField"
        elif value.get("type") == "array":
            items = value.get("items", {})  # Safely get "items" or default to an empty dict
            if "enum" in items:
                type_dict[key] = "taggingAutocomplete"
            elif items.get("type") == "string":
                type_dict[key] = "tagging"
            elif "$ref" in items:
                type_dict[key] = "table"

    return type_dict

# Get a list of all properties from the schema
def load_properties_list_from_schema(schema: dict) -> list[str]:
    properties = schema.get("properties", {})
    return list(properties.keys())


# Create a empty dict based on a range from the properties list
def create_empty_metadata_dict_from_properties_list(
    properties_list: list[str], full_schema: dict, start_property: str, end_property: str
) -> dict[str, str]:
    if start_property not in properties_list or end_property not in properties_list:
        raise ValueError(f"Start or end property not found in properties list: {start_property}, {end_property}")
    
    metadata = {}

    start_index = properties_list.index(start_property)
    end_index = properties_list.index(end_property) + 1

    for property in properties_list[start_index:end_index]:
        # Check if the property uses another schema as type
        if "$ref" in full_schema["properties"][property]:
            required_type = full_schema["properties"][property]["$ref"].split(
                "/")[-1]
            type_properties = full_schema["$defs"][required_type]["properties"]
            metadata[property] = {}
            for type_property in type_properties:
                metadata[property][type_property] = ""

        else:
            metadata[property] = ""

    return metadata

# Create a empty metadata dict with multiple tabs by defining the range for each tab
def create_empty_metadata(schema: str) -> dict[str, dict[str, str]]:
    properties_list = load_properties_list_from_schema(schema)
    metadata = {"GeneralInformation": create_empty_metadata_dict_from_properties_list(properties_list, schema, "name", "url"),
                "Provernance": create_empty_metadata_dict_from_properties_list(properties_list, schema, "softwareVersion", "funding"),
                "ContributorsAndAuthors": create_empty_metadata_dict_from_properties_list(properties_list, schema, "author", "contributor"),
                "TechnicalAspects": create_empty_metadata_dict_from_properties_list(properties_list, schema, "downloadUrl", "targetProduct")
        }
    return metadata

# Fill the empty metadata dict with the extracted metadata
def fill_empty_metadata( empty_metadata: dict[str, dict[str, str]], extracted_metadata: dict[str, str]
) -> dict[str, dict[str, str]]:
    for metadata_tab_name,metadata_tab_dict  in empty_metadata.items():
        for metadata_field_name, metadata_field_value in metadata_tab_dict.items():
           if metadata_field_name in extracted_metadata:
                empty_metadata[metadata_tab_name][metadata_field_name] = extracted_metadata[metadata_field_name]

    return empty_metadata

# Join different tabs to one dict
def join_tabs_to_dict(filled_metadata: dict[str, dict]) -> dict:
    output_metadata = {
            "@context": "https://w3id.org/codemeta/3.0",
            "@type": "SoftwareSourceCode",
        }
    for _, tab_data in filled_metadata.items():
        output_metadata.update(tab_data)

    return output_metadata



# Create curated metadata
def init_curated_metadata(extract_metadata):
    schema_name = 'codemeta_schema.json'
    full_schema = load_schema(schema_name)
    empty_metadata = create_empty_metadata(full_schema)
    filled_metadata = fill_empty_metadata(empty_metadata, extract_metadata)

    metadata_description = load_description_dict_from_schema(full_schema)
    metadata_field_types = define_field_type(full_schema)
    
    joined_metadata = join_tabs_to_dict(filled_metadata)
    return filled_metadata, metadata_description, metadata_field_types, joined_metadata