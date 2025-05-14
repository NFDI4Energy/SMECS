"""
This module provides functions for extracting metadata from GitLab requests.
"""

from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from .init_curated_metadata import init_curated_metadata
from .url_check_GitLab import validate_gitlab_inputs
from .url_check_GitHub import validate_github_inputs
from .gitlab_metadata import get_gitlab_metadata
from .github_metadata import get_github_metadata
from .read_tokens import read_token_from_file

#################### getting metadata from gitlab project ####################

@csrf_exempt
def data_extraction(request):
    if request.method == 'POST':
        # getting values from post
        project_name = request.POST.get('project_name')
        gl_url = request.POST.get('gl_url')
        personal_token_key = request.POST.get('personal_token_key')

        is_valid_github = validate_github_inputs(gl_url)

        tokens = read_token_from_file('tokens.txt')
        default_access_token_GL = tokens.get('gitlab_token')
        is_valid_gitlab, error_messages = validate_gitlab_inputs(gl_url, personal_token_key)

        if is_valid_gitlab:
            extracted_metadata = get_gitlab_metadata(gl_url, personal_token_key)
            if not extracted_metadata:
                extracted_metadata = get_gitlab_metadata(gl_url, default_access_token_GL)

        elif is_valid_github:
            extracted_metadata = get_github_metadata(gl_url, personal_token_key)

        else:
            if 'Invalid URL' in error_messages:
                return 'Invalid URL'
            if 'Invalid GitLab API token' in error_messages:
                return 'Invalid Personal Token Key'
            return 'Invalid GitHub URL'

        return init_curated_metadata(extracted_metadata)


