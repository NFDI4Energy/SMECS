"""
Extract metadata from a GitHub or GitLab repository through HERMES.
"""

from .hermes_process import run_hermes_commands
from .init_curated_metadata import init_curated_metadata
from .metadata_results import metadata_result
from .token_check import validate_token


def extract_repository_metadata(repo_url, personal_token_key=None):
    """
    Validate repository access, run HERMES, and curate its metadata.
    """

    if not repo_url:
        return metadata_result(success=False, errors=["A repository URL is required."])

    # validate_token returns a structured dict: {token, error_type, error_message, forge}
    token_result = validate_token(repo_url, personal_token_key)

    if token_result["error_type"]:
        return metadata_result(
            success=False,
            errors=[token_result["error_message"]],
            error_type=token_result["error_type"],
        )

    valid_token = token_result["token"]  # may be None for public GitHub repos

    hermes_metadata = run_hermes_commands(repo_url, valid_token)
    if not isinstance(hermes_metadata, dict):
        return metadata_result(success=False, errors=["HERMES returned unexpected result format."])

    extracted_metadata = hermes_metadata.get("metadata")
    result = metadata_result(
        success=hermes_metadata.get("success", False),
        warnings=hermes_metadata.get("warnings", []),
        errors=hermes_metadata.get("errors", []),
    )

    if isinstance(extracted_metadata, dict):
        result["metadata"] = init_curated_metadata(extracted_metadata)
    elif result["success"]:
        result["success"] = False
        result["errors"].append("HERMES did not return metadata.")

    return result