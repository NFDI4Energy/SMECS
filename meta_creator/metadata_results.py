"""
Shared result helpers for the metadata input services.
"""


def metadata_result(success=True, metadata=None, warnings=None, errors=None):
    """
    Return the standard result shape consumed by the metadata view.
    """

    # Keep the response structure consistent across all metadata input paths (file, paste, and repository extraction).
    return {
        "success": success,
        "warnings": warnings or [],
        "errors": errors or [],
        "metadata": metadata,
    }