"""
Extract metadata from a GitHub or GitLab repository through CoMET.
"""

from .comet_process import run_comet
from .init_curated_metadata import init_curated_metadata
from .metadata_results import metadata_result
from .token_check import is_github_repo, validate_token


def extract_repository_metadata(repo_url, personal_token_key=None):
    """
    Extract and curate metadata from a GitHub or GitLab repository.
    GitHub repositories may be accessed without a personal access token, while GitLab repositories require a valid token.

    Args:
        repo_url: URL of the GitHub or GitLab repository.
        personal_token_key: Optional personal access token or token key used for repository authentication.

    Returns:
        A metadata result containing success status, warnings, errors, and curated repository metadata when available.
    """

    # A repository URL is required before attempting authentication or running CoMET.
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

    # Run CoMET to extract metadata from the repository.
    comet_result = run_comet(repo_url, valid_token)
    if not isinstance(comet_result, dict):
        return metadata_result(
            success=False,
            errors=["COMET returned an unexpected result format."],
        )

    extracted_metadata = comet_result.get("metadata")
    result = metadata_result(
        success=comet_result.get("success", False),
        warnings=comet_result.get("warnings", []),
        errors=comet_result.get("errors", []),
    )
    
    # Normalize the extracted metadata into the tool's curated metadata structure before returning it.
    if isinstance(extracted_metadata, dict):
        result["metadata"] = init_curated_metadata(extracted_metadata)

    # A successful CoMET run should always provide metadata.
    elif result["success"]:
        result["success"] = False
        result["errors"].append("CoMET did not return metadata.")

    return result
