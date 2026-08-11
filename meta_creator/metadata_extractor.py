"""
This module provides functions for extracting metadata from GitHub repositories through HERMES processes.
"""

import json

from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from .init_curated_metadata import init_curated_metadata
from .url_check_GitLab import validate_gitlab_inputs
from .url_check_GitHub import validate_github_inputs
from .github_metadata import get_github_metadata
from .gitlab_metadata import get_gitlab_metadata
from .hermes_process import run_hermes_commands
from .token_check import validate_token, is_github_repo



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
    result = {
        'success': True,
        'warnings': [],
        'errors': [],
        'metadata': None,
    }

    try:
        parsed_metadata = json.loads(raw_text)
    except json.JSONDecodeError as decode_error:
        result['success'] = False
        result['errors'].append(f"The provided metadata is not valid JSON: {decode_error}")
        return result

    if not isinstance(parsed_metadata, dict):
        result['success'] = False
        result['errors'].append("The provided metadata must be a JSON object.")
        return result

    result['metadata'] = init_curated_metadata(parsed_metadata)
    return result


@csrf_exempt
def extract_metadata_from_file(uploaded_file):
    """
    Handle metadata extraction from a user-uploaded metadata file (e.g. CodeMeta JSON).

    Args:
        uploaded_file (UploadedFile): The uploaded file from request.FILES.

    Returns:
        dict: Same shape as data_extraction()'s return value
              ({'success', 'warnings', 'errors', 'metadata'}).
    """
    try:
        raw_bytes = uploaded_file.read()
        raw_text = raw_bytes.decode('utf-8')
    except UnicodeDecodeError:
        return {
            'success': False,
            'warnings': [],
            'errors': ["The uploaded file is not valid UTF-8 text."],
            'metadata': None,
        }

    return parse_metadata_json(raw_text)


@csrf_exempt
def extract_metadata_from_paste(pasted_metadata):
    """
    Handle metadata extraction from metadata JSON pasted directly into the
    landing page textarea, so users can fix validation errors inline instead
    of re-uploading a file each time.

    Args:
        pasted_metadata (str): Raw JSON text pasted by the user.

    Returns:
        dict: Same shape as data_extraction()'s return value
              ({'success', 'warnings', 'errors', 'metadata'}).
    """
    if not pasted_metadata or not pasted_metadata.strip():
        return {
            'success': False,
            'warnings': [],
            'errors': ["No metadata JSON was provided."],
            'metadata': None,
        }

    return parse_metadata_json(pasted_metadata)
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
        uploaded_file = request.FILES.get('metadata_file')
        if uploaded_file:
            return extract_metadata_from_file(uploaded_file)

        pasted_metadata = request.POST.get('pasted_metadata')
        if pasted_metadata:
            return extract_metadata_from_paste(pasted_metadata)

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