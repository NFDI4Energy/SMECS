import re
import requests

def validate_github_inputs(url):
    """
    Validates the GitHub repository URL by pattern and existence.

    Args:
        url (str): The GitHub repository URL to validate.

    Returns:
        tuple: (bool, str) A boolean indicating validity and an error message.
    """
    # Pattern to match GitHub repo URLs like: https://github.com/user/repo
    url_pattern = r'^https?://github\.com/([a-zA-Z0-9-]+)/([a-zA-Z0-9-_.]+)(?:/)?$'
    error = ''

    match = re.match(url_pattern, url)
    if not match:
        return False, 'Invalid GitHub URL format'

    user, repo = match.groups()
    api_url = f'https://api.github.com/repos/{user}/{repo}'

    try:
        response = requests.get(api_url)
        if response.status_code != 200:
            return False, 'GitHub repository not found or inaccessible'
    except requests.RequestException:
        return False, 'Network error while accessing GitHub'

    return True, ''
