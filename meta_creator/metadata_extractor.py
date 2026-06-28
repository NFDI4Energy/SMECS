"""
This module provides functions for extracting metadata from GitHub repositories through HERMES processes.
"""

from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from .init_curated_metadata import init_curated_metadata
from .url_check_GitLab import validate_gitlab_inputs
from .url_check_GitHub import validate_github_inputs
from .github_metadata import get_github_metadata
from .gitlab_metadata import get_gitlab_metadata
from .hermes_process import run_hermes_commands
from .token_check import validate_token


@csrf_exempt
def data_extraction(request):
    """
    Handle metadata extraction from a GitHub or GitLab repository.

    Expects:
        POST with 'repo_url', and 'personal_token_key'.

    Returns:
        JsonResponse with success status, metadata, warnings, and errors.
    """
    if request.method == 'POST':
        # getting values from post
        project_name = request.POST.get('project_name')
        repo_url = request.POST.get('repo_url')
        personal_token_key = request.POST.get('personal_token_key')
        
        token_result = validate_token(repo_url, personal_token_key)

        if token_result["error_type"]:
            return {
                "success": False,
                "errors": token_result["error_message"],
            }

        token = token_result["token"]  # could be None for GitHub public repos

        result = {
            'success': True,
            'warnings': [],
            'errors': [],
            'metadata': None
        }

        # Run HERMES process
        hermes_metadata = run_hermes_commands(repo_url, token)

        if isinstance(hermes_metadata, dict):
            result['metadata'] = init_curated_metadata(hermes_metadata.get('metadata'))
            result['warnings'].extend(hermes_metadata.get('warnings', []))
            result['errors'].extend(hermes_metadata.get('errors', []))
            result['success'] = hermes_metadata.get('success', False)
        else:
            result['success'] = False
            result['errors'].append("HERMES returned unexpected result format.")

        return result