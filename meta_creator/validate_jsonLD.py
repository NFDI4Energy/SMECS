import copy
from pyld import jsonld


SUPPORTED_CONTEXTS = {
    "https://w3id.org/codemeta/3.0": "https://raw.githubusercontent.com/codemeta/codemeta/3.0/codemeta.jsonld",
    "https://github.com/NFDI4Energy/ERSmeta/blob/main/schema/ersmeta.jsonld": None,
}


def validate_jsonld(json_data: dict) -> tuple[bool, str | None]:
    """
    Validate a JSON-LD metadata object against CodeMeta or ERSMeta schema.

    CodeMeta: uses pyld expand/compact to validate JSON-LD structure.
    ERSMeta:  falls back to structural validation since the context terms
              extend schema.org beyond what pyld resolves.

    Args:
        json_data: Parsed JSON-LD dictionary.

    Returns:
        tuple: (True, None) on success, (False, error_message) on failure.
    """
    try:
        context = json_data["@context"]
    except KeyError:
        return False, "Missing '@context' field."

    if context not in SUPPORTED_CONTEXTS:
        return False, f"Unsupported @context: '{context}'."

    if context.startswith("https://w3id.org/codemeta"):
        return _validate_codemeta_jsonld(json_data, context)

    return _validate_ersmeta_jsonld(json_data)


def _validate_codemeta_jsonld(json_data: dict, context: str) -> tuple[bool, str | None]:
    """Validate a CodeMeta JSON-LD using pyld expand/compact."""
    try:
        cp = copy.deepcopy(json_data)
        cp["@context"] = "https://raw.githubusercontent.com/codemeta/codemeta/3.0/codemeta.jsonld"
        cp = jsonld.expand(cp)
        cp = jsonld.compact(cp, "https://raw.githubusercontent.com/codemeta/codemeta/3.0/codemeta.jsonld")
        keys = cp.keys()

        same = len(set(keys)) == len(set(json_data.keys()))
        if not same:
            diff = set(json_data.keys()) - set(keys)
            if "@type" in diff:
                diff.remove("@type")
            if diff:
                return False, f"Unsupported terms: {sorted(diff)}"

        fail = ":" in keys
        if fail:
            unsupported = [k for k in keys if ":" in k]
            return False, f"Terms not in schema: {unsupported}"

        return True, None

    except Exception as e:
        return False, f"JSON-LD validation failed: {e}"


def _validate_ersmeta_jsonld(json_data: dict) -> tuple[bool, str | None]:
    """
    Validate an ERSMeta JSON-LD structurally.

    Since ERSMeta extends schema.org with domain-specific terms that pyld
    cannot fully resolve through expand/compact, we validate:
    - Required top-level fields exist and are non-empty
    - No completely unknown top-level keys (allowing extra ERSMeta fields)
    """
    required_fields = [
        "@context",
        "@type",
        "name",
        "softwareVersion",
        "programmingLanguage",
        "description",
        "keywords",
        "softwareType",
        "developmentStatus",
        "license",
        "dateCreated",
        "contributor",
        "downloadUrl",
        "metadataVersion",
        "sdLicense",
        "sdPublisher",
    ]

    item_type = json_data.get("@type")
    if item_type not in ("EnergyResearchSoftware", "SoftwareSourceCode"):
        return False, f"Invalid @type for ERSMeta: '{item_type}'."

    for field in required_fields:
        if field not in json_data or json_data[field] == "" or json_data[field] is None:
            return False, f"Missing or empty required field: '{field}'."

    return True, None


def validate_codemeta(json_data):
    """Check whether a codemeta json object is valid (legacy function)."""
    result, error = validate_jsonld(json_data)
    if error:
        print(error)
    return result