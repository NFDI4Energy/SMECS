import re
import requests

from urllib.parse import urlparse
from .read_tokens import read_token_from_file


# Check if the URL is a Valid GitLab URL and a valid GitLab Token
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
    original_url_pattern = r'^https?://gitlab\.[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(/|$)'
    new_url_pattern = r'^https?://(?:[^./]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?::\d+)?/(?:[a-zA-Z0-9-]+/)*[a-zA-Z0-9-]+/?$'
    errors = []
    # Check if the URL matches the pattern
    if not re.match(original_url_pattern, url):
        if not re.match(new_url_pattern, url):
            errors.append('Invalid URL')

    try:
        url_response = requests.get(url, timeout=10)
        if url_response.status_code != 200:
            errors.append('Invalid URL')
    except requests.RequestException:
        errors.append('Error occurred while validating the URL')

    parsed_url = urlparse(url)
    domain = parsed_url.netloc
    api_url = f'https://{domain}/api/v4/user'
    headers = {'Authorization': f'Bearer {token}'}

    tokens = read_token_from_file('tokens.txt')
    default_access_token = tokens.get('gitlab_token') 

    try:
        api_response = requests.get(api_url, headers=headers, timeout=10)
        if api_response.status_code != 200:
            headers = {'Authorization': f'Bearer {default_access_token}'}
            api_response_default = requests.get(api_url, headers=headers, timeout=10)
            if api_response_default.status_code != 200:
                errors.append('Invalid GitLab API token')
    except requests.RequestException:
        errors.append('Error occurred while validating GitLab API token')

    if len(errors) == 0:
        return True, ''
    return False, ', '.join(errors)
