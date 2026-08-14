"""
Import structured metadata from uploaded JSON files.
"""

import json

from .init_curated_metadata import init_curated_metadata
from .metadata_results import metadata_result


def parse_metadata_json(raw_text):
    """
    Parse and validate a raw metadata JSON string, shared by both the file-upload
    and paste-JSON input paths so they apply identical validation.

    Args:
        raw_text (str): Raw JSON text (already decoded to a Python str).

    Returns:
        dict: Same shape as data_extraction()'s return value
              ({'success', 'warnings', 'errors', 'metadata'}).
    """
    try:
        # Parse the raw JSON text into a Python object.
        # JSON decoding errors are handled here so both file and paste inputs receive the same validation and error response.
        parsed_metadata = json.loads(raw_text)
    except json.JSONDecodeError as error:
        return metadata_result(
            success=False,
            errors=[f"The provided metadata is not valid JSON: {error}"],
        )

    # Metadata is expected to be a JSON object. Reject other valid JSON types such as arrays, strings, numbers, booleans, or null.
    if not isinstance(parsed_metadata, dict):
        return metadata_result(
            success=False,
            errors=["The provided metadata must be a JSON object."],
        )

    # Normalize the parsed metadata into the tool's curated metadata structure before returning it to the caller.
    return metadata_result(metadata=init_curated_metadata(parsed_metadata))


def import_metadata_file(uploaded_file):
    """
    Decode an uploaded UTF-8 JSON file and import its metadata.
    Args:
        uploaded_file (UploadedFile): The uploaded file from request.FILES.

    Returns:
        dict: Same shape as data_extraction()'s return value
              ({'success', 'warnings', 'errors', 'metadata'}).
    """
    try:
        raw_content = uploaded_file.read()
        raw_text = raw_content.decode("utf-8") if isinstance(raw_content, bytes) else raw_content
    except UnicodeDecodeError:
        # Return a user-friendly error instead of passing invalid text to the JSON parser.
        return metadata_result(
            success=False,
            errors=["The uploaded file is not valid UTF-8 text."],
        )

    # Use the same parser as pasted metadata to keep validation and metadata initialization consistent across both input methods.
    return parse_metadata_json(raw_text)