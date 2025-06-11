import requests
import json
import os

def load_tokens_from_file(file_path="tokens.txt"):
    """
    Loads tokens from a JSON-formatted text file.

    Args:
        file_path (str): Path to the token file. Defaults to 'tokens.txt'.

    Returns:
        dict: A dictionary containing tokens if the file exists and is valid JSON,
              otherwise an empty dictionary.
    """
    if not os.path.exists(file_path):
        return {}
    with open(file_path, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def is_github_repo(url):
    """
    Checks if a given URL points to a GitHub repository.

    Args:
        url (str): The repository URL.

    Returns:
        bool: True if the URL contains 'github', otherwise False.
    """
    return "github" in url


def is_gitlab_repo(url):
    """
    Checks if a given URL points to a GitLab repository.

    Args:
        url (str): The repository URL.

    Returns:
        bool: True if the URL contains 'gitlab', otherwise False.
    """
    return "gitlab" in url


def check_github_token(repo_url, token):
    """
    Validates a GitHub token by sending a request to the GitHub API for the repository.

    Args:
        repo_url (str): The GitHub repository URL.
        token (str): The GitHub token to validate.

    Returns:
        bool: True if the token is valid (status code 200), otherwise False.
    """
    api_url = repo_url.replace("github.com", "api.github.com/repos")
    headers = {"Authorization": f"token {token}"}
    response = requests.get(api_url, headers=headers)
    return response.status_code == 200


def check_gitlab_token(repo_url, token):
    """
    Validates a GitLab token by sending a request to the GitLab API for the repository.

    Args:
        repo_url (str): The GitLab repository URL.
        token (str): The GitLab token to validate.

    Returns:
        bool: True if the token is valid (status code 200), otherwise False.
    """
    try:
        project_path = repo_url.split("gitlab.com/")[1].rstrip("/").replace("/", "%2F")
        api_url = f"https://gitlab.com/api/v4/projects/{project_path}"
    except IndexError:
        return False
    headers = {"PRIVATE-TOKEN": token}
    response = requests.get(api_url, headers=headers)
    return response.status_code == 200


def validate_token(repo_url, token):
    """
    Validates the given token or falls back to a stored token from file based on the repo type.

    For GitHub:
        - Uses the provided token if valid.
        - Otherwise, uses a fallback GitHub token from file if available and valid.
        - Returns None if no token is valid, but this is acceptable for GitHub.

    For GitLab:
        - Uses the provided token if valid.
        - Otherwise, uses a fallback GitLab token from file if available and valid.
        - Returns None if no valid token is available (required for GitLab).

    Args:
        repo_url (str): The repository URL.
        token (str): The optional token provided for authentication.

    Returns:
        str or None: A valid token if available and valid, otherwise None.
    """
    tokens_from_file = load_tokens_from_file()
    
    if is_github_repo(repo_url):
        if token and check_github_token(repo_url, token):
            return token  # Valid provided token
        fallback_token = tokens_from_file.get("github_token")
        if fallback_token and check_github_token(repo_url, fallback_token):
            return fallback_token  # Valid fallback token
        return None  # No token available but OK for GitHub

    elif is_gitlab_repo(repo_url):
        if token and check_gitlab_token(repo_url, token):
            return token  # Valid provided token
        fallback_token = tokens_from_file.get("gitlab_token")
        if fallback_token and check_gitlab_token(repo_url, fallback_token):
            return fallback_token  # Valid fallback token
        return None  # Not okay for GitLab

    return None  
