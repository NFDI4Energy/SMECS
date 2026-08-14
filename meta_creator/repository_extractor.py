"""
Extract metadata from a GitHub or GitLab repository through HERMES.
"""

from .hermes_process import run_hermes_commands
from .init_curated_metadata import init_curated_metadata
from .metadata_results import metadata_result
from .token_check import is_github_repo, validate_token


def extract_repository_metadata(repo_url, personal_token_key=None):
    """
    Validate repository access, run HERMES, and curate its metadata.
    Handle metadata extraction from a GitHub or GitLab repository.
    """

    # A repository URL is required before attempting authentication or running HERMES.
    if not repo_url:
        return metadata_result(success=False, errors=["A repository URL is required."])

    # Validate the provided personal access token, if applicable.
    # GitHub repositories can be accessed without a token, while GitLab requires a valid token for metadata extraction.
    valid_token = validate_token(repo_url, personal_token_key)
    if not is_github_repo(repo_url) and not valid_token:
        return metadata_result(
            success=False,
            errors=["GitLab requires a valid personal access token."],
        )

    # Run HERMES to extract metadata from the repository.
    hermes_metadata = run_hermes_commands(repo_url, valid_token)
    if not isinstance(hermes_metadata, dict):
        return metadata_result(
            success=False,
            errors=["HERMES returned unexpected result format."],
        )

    extracted_metadata = hermes_metadata.get("metadata")
    result = metadata_result(
        success=hermes_metadata.get("success", False),
        warnings=hermes_metadata.get("warnings", []),
        errors=hermes_metadata.get("errors", []),
    )
    
    # Normalize the extracted metadata into the tool's curated metadata structure before returning it.
    if isinstance(extracted_metadata, dict):
        result["metadata"] = init_curated_metadata(extracted_metadata)

    # A successful HERMES run should always provide metadata.
    elif result["success"]:
        result["success"] = False
        result["errors"].append("HERMES did not return metadata.")

    return result