"""
Load structured metadata pasted into the landing page textarea.
Users can fix validation errors inline instead of re-uploading a file each time.
Args:
        pasted_metadata (str): Raw JSON text pasted by the user.

    Returns:
        dict: Same shape as data_extraction()'s return value
              ({'success', 'warnings', 'errors', 'metadata'}).
"""

from .metadata_importer import parse_metadata_json
from .metadata_results import metadata_result


def load_pasted_metadata(pasted_metadata):
    """
    Validate and load JSON text pasted by the user.
    """

    # Reject empty or whitespace-only input before attempting to parse it as JSON.
    if not pasted_metadata or not pasted_metadata.strip():
        return metadata_result(
            success=False,
            errors=["No metadata JSON was provided."],
        )

    # Use the shared JSON parser so pasted metadata follows the same validation and initialization logic as metadata imported from a file.
    return parse_metadata_json(pasted_metadata)