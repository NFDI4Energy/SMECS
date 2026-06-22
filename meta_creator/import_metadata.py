import json


class ImportError(Exception):
    """Custom exception for import validation errors."""
    pass


def parse_jsonld_file(uploaded_file) -> dict:
    """
    Parse an uploaded JSON-LD file.

    Args:
        uploaded_file: Django UploadedFile object.

    Returns:
        dict: Parsed JSON content.

    Raises:
        ImportError: If file is empty or not valid JSON.
    """
    try:
        content = uploaded_file.read().decode('utf-8')
    except Exception as e:
        raise ImportError(f"Failed to read file: {e}")

    if not content.strip():
        raise ImportError("Uploaded file is empty.")

    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise ImportError(f"Invalid JSON: {e}")

    if not isinstance(data, dict):
        raise ImportError("JSON file must contain a single object at the root.")

    return data


def validate_import_file(json_data: dict) -> tuple[bool, str | None]:
    """
    Validate an imported JSON-LD metadata file.

    Args:
        json_data: Parsed JSON-LD dictionary.

    Returns:
        tuple: (True, None) on success, (False, error_message) on failure.
    """
    if '@context' not in json_data:
        return False, "Missing required '@context' field."

    if '@type' not in json_data:
        return False, "Missing required '@type' field."

    context = json_data.get('@context')
    valid_contexts = [
        "https://w3id.org/codemeta/3.0",
        "https://github.com/NFDI4Energy/ERSmeta/blob/main/schema/ersmeta.jsonld",
    ]

    if context not in valid_contexts:
        return False, (
            f"Unsupported @context: '{context}'. "
            f"Supported contexts: {', '.join(valid_contexts)}"
        )

    allowed_types = ["SoftwareSourceCode", "EnergyResearchSoftware"]
    item_type = json_data.get('@type')
    if item_type not in allowed_types:
        return False, (
            f"Unsupported @type: '{item_type}'. "
            f"Supported types: {', '.join(allowed_types)}"
        )

    return True, None