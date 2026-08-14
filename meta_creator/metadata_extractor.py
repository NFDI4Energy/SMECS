"""
Dispatch metadata form input to its dedicated service.
"""

from .metadata_importer import import_metadata_file
from .metadata_paster import load_pasted_metadata
from .metadata_results import metadata_result
from .repository_extractor import extract_repository_metadata


def data_extraction(request):
    """
    Route the submitted input source to file, paste, or repository handling.
    """

    # Metadata extraction is only supported through POST requests.
    if request.method != "POST":
        return metadata_result(success=False, errors=["Metadata extraction requires a POST request."])

    input_source = request.POST.get("input_source")

    # Handle metadata uploaded as a file.
    if input_source == "file":
        uploaded_file = request.FILES.get("metadata_file")
        if not uploaded_file:
            return metadata_result(success=False, errors=["No metadata file was provided."])
        return import_metadata_file(uploaded_file)

    # Handle metadata provided directly by the user through the paste input.
    if input_source == "paste":
        return load_pasted_metadata(request.POST.get("pasted_metadata", ""))

    # Treat an unspecified input source as a repository URL to maintain
    if input_source not in (None, "url"):
        return metadata_result(success=False, errors=["Unknown metadata input source."])

    # Fall back to checking for file or pasted metadata before attempting repository extraction.
    uploaded_file = request.FILES.get("metadata_file")
    if uploaded_file:
        return import_metadata_file(uploaded_file)
    if request.POST.get("pasted_metadata"):
        return load_pasted_metadata(request.POST["pasted_metadata"])

    # If no file or pasted metadata is available, extract metadata from the repository using the provided URL and personal access token.
    return extract_repository_metadata(
        request.POST.get("repo_url"),
        request.POST.get("personal_token_key"),
    )