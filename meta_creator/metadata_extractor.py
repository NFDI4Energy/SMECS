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
from .token_check import validate_token, is_github_repo


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
        
        valid_token = validate_token(repo_url, personal_token_key)
        
        if not is_github_repo(repo_url) and not valid_token:
            result =  {
                'success': False,
                'errors': "GitLab requires a valid personal access token."
            }
        else:
            token = valid_token  # could be None for GitHub

            # Define empty result dict
            result = {
                'success': True,
                'warnings': [],
                'errors': [],
                'metadata': None
            }

            # # Validate GitHub input
            # is_valid_github, error_messages = validate_github_inputs(gl_url)
            # if not is_valid_github:
            #     is_valid_gitlab, error_messages_gitlab = validate_gitlab_inputs(gl_url, personal_token_key)

            #     if not is_valid_gitlab:
            #         error_messages.join(error_messages_gitlab)
            #         return {
            #             'success': False,
            #             'errors': error_messages
            #         }

            #     extracted_metadata = get_gitlab_metadata(gl_url, personal_token_key)
            #     if not extracted_metadata:
            #         extracted_metadata = get_gitlab_metadata(gl_url, default_access_token_gitlab)

            #     result['metadata'] = init_curated_metadata(extracted_metadata)


            # Run HERMES process
            hermes_metadata = run_hermes_commands(repo_url, token)
            # if hermes_metadata == None:
            #     hermes_metadata = get_github_metadata(gl_url, default_access_token_GH)

            if isinstance(hermes_metadata, dict):
                result['metadata'] = init_curated_metadata(hermes_metadata.get('metadata'))
                result['warnings'].extend(hermes_metadata.get('warnings', []))
                result['errors'].extend(hermes_metadata.get('errors', []))
                result['success'] = hermes_metadata.get('success', False)
            else:
                result['success'] = False
                result['errors'].append("HERMES returned unexpected result format.")
    
        return result