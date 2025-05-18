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
        if response.status_code == 403:
            if "rate limit" in response.text.lower():
                return False, 'GitHub API rate limit exceeded. Please use a personal access token.'
            return False, 'Access to the GitHub repository is forbidden.'

        if response.status_code != 200:
            return False, 'GitHub repository not found or inaccessible'

    except requests.RequestException as e:
        return False, f'Network error while accessing GitHub: {str(e)}'

    return True, ''
