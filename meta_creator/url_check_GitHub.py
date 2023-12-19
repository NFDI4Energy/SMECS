import re
from urllib.parse import urlparse
import requests

# Check if the URL is a Valid GitHub URL
def validate_github_inputs(url):
    # Check if the URL matches the GitHub repository pattern
    pattern = re.compile(r'https?://github\.com/([a-zA-Z0-9-]+)/([a-zA-Z0-9-_]+)')
    match = pattern.match(url)

    if not match:
        return False  # URL doesn't match the GitHub repository pattern

    # Check if the GitHub repository actually exists
    try:
        response = requests.get(f'https://api.github.com/repos/{match.group(1)}/{match.group(2)}')
        return response.status_code == 200
    except requests.RequestException:
        return False  # Unable to connect to GitHub API
    