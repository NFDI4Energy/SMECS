"""
Shared result helpers for the metadata input services.
"""


def metadata_result(success=True, metadata=None, warnings=None, errors=None, error_type=None):
    """
    Return the standard result shape consumed by the metadata view.
    """
    return {
        "success": success,
        "warnings": warnings or [],
        "errors": errors or [],
        "metadata": metadata,
        "error_type": error_type,
    }