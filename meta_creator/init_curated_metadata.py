# Intilize curated metadata
# Within the file all relevant metadata elements for the curation page are defined

from django.conf import settings
import json
import os

def load_schema(schema_name: str) -> dict:
    """
    Load a JSON schema file from the static/schema directory.

    Args:
        schema_name (str): The filename of the schema to load.

    Returns:
        dict: The loaded JSON schema as a dictionary.

    Raises:
        FileNotFoundError: If the schema file does not exist.
        ValueError: If the schema file contains invalid JSON.
    """
    schema_path = os.path.join(settings.BASE_DIR, 'static', 'schema', schema_name)
    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"Schema file '{schema_name}' not found at {schema_path}")
    except json.JSONDecodeError:
        raise ValueError(f"Schema file '{schema_name}' contains invalid JSON")


# Load descriptions from the Schema
def load_description_dict_from_schema(schema: dict) -> dict[str, str]:
    """
    Extracts the descriptions of properties from a JSON schema.

    Args:
        schema (dict): The JSON schema.

    Returns:
        dict[str, str]: A dictionary mapping property names to their descriptions.
    """
    properties = schema.get("properties", {})
    description_dict = {}

    for key, value in properties.items():
        if "description" in value:
            description_dict[key] = value["description"]

    types = schema.get("$defs", {})
    for name, information in types.items():
        properties = information.get("properties", None)
        if properties:
            for key, value in properties.items():
                desc = value.get("description")
                if desc and key not in description_dict:
                    description_dict[key] = desc

    return description_dict

# Define required field_type per element
def define_field_type(schema: dict, types: dict, array = False) -> dict[str, str]:
    """
    Determines the field type for each property in the schema for curation UI.

    Args:
        schema (dict): The JSON schema containing properties.
        types (Optional[dict]): Definitions for referenced types ($defs).

    Returns:
        Dict[str, Any]: Mapping of property names to their field types.
    """
    properties = schema.get("properties", {})
    type_dict = {}

    for key, value in properties.items():
        ## Hard coding for certain elements
        if key == "license":
            type_dict[key] = "tagging_autocomplete"
        elif key == "@type" or key == "@context":
            type_dict[key] = "hidden"
        elif key == "authors" or key == "contributors":
            type_dict[key] = "person_table"    

        ## Flexible elements
        elif "enum" in value:
            type_dict[key] = "dropdown"
        elif "$ref" in value: 
            required_type = value["$ref"].split("/")[-1]
            subproperties = types[required_type].get("properties")
            # Recursively define field types for referenced type
            if len(subproperties) > 1:
                type_dict[key] = define_field_type(types[required_type], None)
            else:
                type_dict[key] = "single_input_object"
        elif value.get("type") == "string":
            if key == "description":
                type_dict[key] = "big_field"
            elif key == "abstract":
                type_dict[key] = "long_field"
            else:
                type_dict[key] = "single_inputs"
        elif value.get("type") == "array":
            items = value.get("items", {})  # Safely get "items" or default to an empty dict
            if "enum" in items:            
                type_dict[key] = "tagging_autocomplete"                
            elif items.get("type") == "string":
                type_dict[key] = "tagging"
            elif "$ref" in items:
                required_type = items["$ref"].split("/")[-1]
                subproperties = types[required_type].get("properties")
                if len(subproperties) > 1:
                    type_dict[key] = [define_field_type(types[required_type], None)]
                else:
                    type_dict[key] = "tagging_object"

    return type_dict

# Get a list of all properties from the schema
def load_properties_list_from_schema(schema: dict) -> list[str]:
    """
    Retrieves a list of property names from the schema.

    Args:
        schema (dict): The JSON schema.

    Returns:
        list[str]: A list of property names.
    """
    properties = schema.get("properties", {})
    return list(properties.keys())

def create_empty_ref_object(prop_schema: dict, full_schema: dict) -> dict:
    """
    Creates an empty dictionary for a property that uses $ref in the schema.

    Args:
        prop_schema (dict): The property schema containing the $ref.
        full_schema (dict): The full JSON schema (for resolving $defs).

    Returns:
        dict: An empty dictionary with keys for each property in the referenced type.
    """
    required_type = prop_schema["$ref"].split("/")[-1]
    type_properties = full_schema["$defs"][required_type]["properties"]
    ref_obj = {"@type": required_type}
    for type_property, value in type_properties.items():
        if value.get("type") == "array":
            ref_obj[type_property] = []
        else:
            ref_obj[type_property] = ""
    return ref_obj

# Create a empty dict based on a range from the properties list
def create_empty_metadata_dict_from_properties_list(
    properties_list: list[str], full_schema: dict, start_property: str, end_property: str
) -> dict[str, str]:
    """
    Creates an empty metadata dictionary for a range of properties from the schema.

    Args:
        properties_list (list[str]): List of all property names in the schema.
        full_schema (dict): The full JSON schema.
        start_property (str): The first property in the range.
        end_property (str): The last property in the range.

    Returns:
        dict[str, str]: A dictionary with empty values for each property in the range.
    """
    if start_property not in properties_list or end_property not in properties_list:
        raise ValueError(f"Start or end property not found in properties list: {start_property}, {end_property}")
    
    metadata = {}

    start_index = properties_list.index(start_property)
    end_index = properties_list.index(end_property) + 1

    for property in properties_list[start_index:end_index]:
        prop_schema = full_schema["properties"][property]
        # Check if the property uses another schema as type
        if "$ref" in prop_schema:
            metadata[property] = create_empty_ref_object(prop_schema, full_schema)
        elif prop_schema.get("type") == "array":
            items = prop_schema.get("items", {})
            if "$ref" in items:
                element = create_empty_ref_object(items, full_schema)
                metadata[property] = [element]
            else:
                metadata[property] = []
        else:
            metadata[property] = ""

    return metadata

# Create a empty metadata dict with multiple tabs by defining the range for each tab
def create_empty_metadata(schema: dict) -> dict[str, dict[str, str]]:
    """
    Creates an empty metadata dictionary with multiple tabs, each defined by a property range.

    Args:
        schema (dict): The JSON schema.

    Returns:
        dict[str, dict[str, str]]: A dictionary with tab names as keys and empty metadata dicts as values.
    """
    properties_list = load_properties_list_from_schema(schema)
    metadata = {"General": create_empty_metadata_dict_from_properties_list(properties_list, schema, "name", "inLanguage"),
                "GeneralDescription": create_empty_metadata_dict_from_properties_list(properties_list, schema, "abstract", "copyrightHolder"),
                "Provenance": create_empty_metadata_dict_from_properties_list(properties_list, schema, "dateCreated", "funding"),
                "RelatedPersons": create_empty_metadata_dict_from_properties_list(properties_list, schema, "contributor", "maintainer"),
                "Usage": create_empty_metadata_dict_from_properties_list(properties_list, schema, "downloadUrl", "example"),
                "CommunityAndQuality": create_empty_metadata_dict_from_properties_list(properties_list, schema, "usedInPublication", "validation"),
                "Interface": create_empty_metadata_dict_from_properties_list(properties_list, schema, "output", "input"),
                "Interoperability": create_empty_metadata_dict_from_properties_list(properties_list, schema, "compatibleHardware", "usedData"),
                "Functionalities": create_empty_metadata_dict_from_properties_list(properties_list, schema, "purpose", "usedOptimization"),
                "TechnicalRequirements": create_empty_metadata_dict_from_properties_list(properties_list, schema, "typicalHardware", "fileSize"),
                "MetaMetadata": create_empty_metadata_dict_from_properties_list(properties_list, schema, "metadataVersion", "sdLicense"),
        }
    return metadata

def enforce_element_structure(empty_value, value):
    """
    Recursively enforce that value matches the structure of empty_value.
    """
    if isinstance(empty_value, dict):
        # If value is not a dict, return a copy of the empty structure
        if not isinstance(value, dict):
            result = empty_value.copy()
            result["identifier"] = value
            return result
        result = empty_value.copy()
        if result["@type"] == value.get("@type"):
            for k in result:
                result[k] = enforce_element_structure(result[k], value.get(k, result[k]))
        return result
    elif isinstance(empty_value, list):
        # If value is not a list, wrap it in a list
        if not isinstance(value, list):
            value = [value]
        # If the list should have a certain structure, enforce it for each element
        if len(empty_value) > 0:
            element_structure = empty_value[0]
            return [enforce_element_structure(element_structure, v) for v in value]
        else:
            return value
    else:
        return value

# Fill the empty metadata dict with the extracted metadata
def fill_empty_metadata( empty_metadata: dict[str, dict[str, str]], extracted_metadata: dict[str, str]
) -> dict[str, dict[str, str]]:
    """
    Fills an empty metadata dictionary with extracted metadata values.

    Args:
        empty_metadata (dict[str, dict[str, str]]): The empty metadata dictionary.
        extracted_metadata (dict[str, str]): The extracted metadata to fill in.

    Returns:
        dict[str, dict[str, str]]: The filled metadata dictionary.
    """
    for metadata_tab_name,metadata_tab_dict  in empty_metadata.items():
        for metadata_field_name, metadata_field_value in metadata_tab_dict.items():
           if metadata_field_name in extracted_metadata:
                value = extracted_metadata[metadata_field_name]
                empty_metadata[metadata_tab_name][metadata_field_name] = enforce_element_structure(metadata_field_value, value)

    return empty_metadata

# Join different tabs to one dict
def join_tabs_to_dict(filled_metadata: dict[str, dict]) -> dict:
    """
    Joins multiple tabbed metadata dictionaries into a single metadata dictionary.

    Args:
        filled_metadata (dict[str, dict]): The filled metadata with tabs.

    Returns:
        dict: The combined metadata dictionary.
    """
    output_metadata = {
            "@context": "https://github.com/NFDI4Energy/ERSmeta/blob/main/schema/ersmeta.jsonld",
            "@type": "EnergyResearchSoftware",
        }
    for _, tab_data in filled_metadata.items():
        output_metadata.update(tab_data)

    return output_metadata



# Create curated metadata
def init_curated_metadata(extract_metadata):
    """
    Initializes the curated metadata structure, filling it with extracted metadata and schema information.

    Args:
        extract_metadata (dict): The extracted metadata to fill in.

    Returns:
        tuple: (filled_metadata, metadata_description, metadata_field_types, joined_metadata)
    """
    schema_name = 'ersmeta_schema.json'
    full_schema = load_schema(schema_name)
    empty_metadata = create_empty_metadata(full_schema)
    #print(f"Empty metadata:\n{empty_metadata}")

    extract_metadata['metadataVersion'] = 0.8
    extract_metadata['sdLicense'] = [{
      "@type": "CreativeWork",
      "identifier": "CC0-1.0",
      "name": "Creative Commons Zero v1.0 Universal"
    }]

    filled_metadata = fill_empty_metadata(empty_metadata, extract_metadata)
    print(f"Filled metadata:\n{filled_metadata}")

    metadata_description = load_description_dict_from_schema(full_schema)
    metadata_field_types = define_field_type(full_schema, full_schema["$defs"])
    #print(f"Field types:\n{metadata_field_types}")
    
    joined_metadata = join_tabs_to_dict(filled_metadata)
    return filled_metadata, metadata_description, metadata_field_types, joined_metadata