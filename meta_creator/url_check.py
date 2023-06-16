"""
Module: gitlab_utils

This module contains utility functions for working with GitLab repositories.
"""

import re
import requests

def validate_gitlab_inputs(url, token):
    """
    Validates both the GitLab repository URL and API token.

    Args:
        url (str): The GitLab repository URL to validate.
        token (str): The GitLab API token to validate.

    Returns:
        tuple: A tuple containing the validation result (bool) and the error messages (str).
    """
    # Regular expression pattern to match GitLab repository URLs
    url_pattern = r'^https?://gitlab\.com/'
    errors = []
    # Check if the URL matches the pattern
    if not re.match(url_pattern, url):
        errors.append('Invalid GitLab URL')

    # Validate the URL by sending a GET request
    url_response = requests.get(url, timeout=10)
    if url_response.status_code != 200:
        errors.append('Invalid GitLab URL')

    # Validate the token by making a request to the GitLab API
    api_url = 'https://gitlab.com/api/v4/user'
    headers = {'Authorization': f'Bearer {token}'}

    try:
        api_response = requests.get(api_url, headers=headers, timeout=10)
        if api_response.status_code != 200:
            errors.append('Invalid GitLab API token')
    except requests.RequestException:
        errors.append('Error occurred while validating GitLab API token')

    if len(errors) == 0:
        return True, ''
    return False, ', '.join(errors)
