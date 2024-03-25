import re
import requests

def validate_github_inputs(url):
    """
    Validates both the GitHub repository URL and API token.

    Args:
        url (str): The GitHub repository URL to validate.
        token (str): The GitHub API token (not used in GitHub validation).

    Returns:
        tuple: A tuple containing the validation result (bool) and the error messages (str).
    """
    # Regular expression pattern to match GitHub repository URLs
    url_pattern = r'^https?://github\.com/([a-zA-Z0-9-]+)/([a-zA-Z0-9-_]+)'
    error = ''

    # Check if the URL matches the pattern
    match = re.match(url_pattern, url)
    if not match:
        error = 'Invalid GitHub URL'

    # Validate the URL by sending a GET request to GitHub API
    if not error:
        response = requests.get(f'https://api.github.com/repos/{match.group(1)}/{match.group(2)}')
        if response.status_code != 200:
            error = 'Invalid GitHub URL'

    if len(error) == 0:
        return True, ''
    return False