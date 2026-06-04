import requests
import json
import os

def load_tokens_from_file(file_path="tokens.txt"):
    if not os.path.exists(file_path):
        return {}
    with open(file_path, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def is_github_repo(url):
    return "github" in url


def check_github_token(repo_url, token):
    """
    Validates a GitHub token and URL against the GitHub API.

    Returns:
        dict with keys 'status' and 'message'.
        status values: 'valid', 'invalid_token', 'expired_token', 'invalid_url', 'error'
    """
    api_url = repo_url.replace("github.com", "api.github.com/repos").rstrip("/")
    headers = {"Authorization": f"token {token}"} if token else {}

    try:
        response = requests.get(api_url, headers=headers)
    except requests.RequestException as e:
        return {"status": "error", "message": f"Network error while reaching GitHub: {str(e)}"}

    if response.status_code == 200:
        return {"status": "valid", "message": ""}

    if response.status_code == 401:
        try:
            msg = response.json().get("message", "")
            if "expired" in msg.lower():
                return {
                    "status": "expired_token",
                    "message": "The GitHub token has expired. Please generate a new token and try again.",
                }
        except Exception:
            pass
        return {
            "status": "invalid_token",
            "message": "The provided GitHub token is invalid. Please check your token and try again.",
        }

    if response.status_code == 404:
        return {
            "status": "invalid_url",
            "message": "GitHub repository not found. Please check the URL and try again.",
        }

    if response.status_code == 403:
        return {
            "status": "error",
            "message": "Access to GitHub is forbidden. You may have exceeded the API rate limit.",
        }

    return {
        "status": "error",
        "message": f"Unexpected response from GitHub API (HTTP {response.status_code}).",
    }


def check_gitlab_token(repo_url, token):
    """
    Validates a GitLab token and URL against the GitLab API.

    Returns:
        dict with keys 'status' and 'message'.
        status values: 'valid', 'invalid_token', 'expired_token', 'invalid_url', 'error'
    """
    try:
        project_path = repo_url.split("gitlab.com/")[1].rstrip("/").replace("/", "%2F")
        api_url = f"https://gitlab.com/api/v4/projects/{project_path}"
    except IndexError:
        return {"status": "invalid_url", "message": "Invalid GitLab repository URL format."}

    headers = {"PRIVATE-TOKEN": token} if token else {}

    try:
        response = requests.get(api_url, headers=headers)
    except requests.RequestException as e:
        return {"status": "error", "message": f"Network error while reaching GitLab: {str(e)}"}

    if response.status_code == 200:
        return {"status": "valid", "message": ""}

    if response.status_code == 401:
        try:
            body = response.json()
            # GitLab returns {"error": "invalid_token", "error_description": "Token is expired..."}
            error_desc = body.get("error_description", "") or body.get("message", "")
            if "expired" in error_desc.lower():
                return {
                    "status": "expired_token",
                    "message": "The GitLab token has expired. Please generate a new token and try again.",
                }
        except Exception:
            pass
        return {
            "status": "invalid_token",
            "message": "The provided GitLab token is invalid. Please check your token and try again.",
        }

    if response.status_code == 404:
        return {
            "status": "invalid_url",
            "message": "GitLab repository not found. Please check the URL and try again.",
        }

    if response.status_code == 403:
        return {
            "status": "error",
            "message": "Access to the GitLab repository is forbidden.",
        }

    return {
        "status": "error",
        "message": f"Unexpected response from GitLab API (HTTP {response.status_code}).",
    }


def validate_token(repo_url, token):
    """
    Validates the given token (or a fallback from file) for the given repository URL.

    Returns:
        dict: {
            'token': str or None  — the valid token to use for subsequent requests,
            'error_type': str or None  — one of 'invalid_token', 'expired_token',
                                         'invalid_url', 'no_token', 'error',
            'error_message': str or None  — human-readable error for the user,
        }
    """
    tokens_from_file = load_tokens_from_file()

    if is_github_repo(repo_url):
        if token:
            result = check_github_token(repo_url, token)
            if result["status"] == "valid":
                return {"token": token, "error_type": None, "error_message": None}

            # For a token-specific error, try the fallback before surfacing to the user
            if result["status"] in ("invalid_token", "expired_token"):
                fallback = tokens_from_file.get("github_token")
                if fallback and fallback != token:
                    fb_result = check_github_token(repo_url, fallback)
                    if fb_result["status"] == "valid":
                        return {"token": fallback, "error_type": None, "error_message": None}
                # Surface the original user-token error
                return {"token": None, "error_type": result["status"], "error_message": result["message"]}

            # URL invalid or other error — return immediately
            return {"token": None, "error_type": result["status"], "error_message": result["message"]}

        # No token provided — try fallback, then proceed without auth (public repos)
        fallback = tokens_from_file.get("github_token")
        if fallback:
            fb_result = check_github_token(repo_url, fallback)
            if fb_result["status"] == "valid":
                return {"token": fallback, "error_type": None, "error_message": None}
            if fb_result["status"] == "invalid_url":
                return {"token": None, "error_type": "invalid_url", "error_message": fb_result["message"]}

        # No token at all — check URL validity anonymously
        url_check = check_github_token(repo_url, None)
        if url_check["status"] == "invalid_url":
            return {"token": None, "error_type": "invalid_url", "error_message": url_check["message"]}

        # Public repo, proceed without a token
        return {"token": None, "error_type": None, "error_message": None}

    else:  # GitLab
        if token:
            result = check_gitlab_token(repo_url, token)
            if result["status"] == "valid":
                return {"token": token, "error_type": None, "error_message": None}

            if result["status"] in ("invalid_token", "expired_token"):
                fallback = tokens_from_file.get("gitlab_token")
                if fallback and fallback != token:
                    fb_result = check_gitlab_token(repo_url, fallback)
                    if fb_result["status"] == "valid":
                        return {"token": fallback, "error_type": None, "error_message": None}
                return {"token": None, "error_type": result["status"], "error_message": result["message"]}

            return {"token": None, "error_type": result["status"], "error_message": result["message"]}

        # No token provided — try fallback
        fallback = tokens_from_file.get("gitlab_token")
        if fallback:
            fb_result = check_gitlab_token(repo_url, fallback)
            if fb_result["status"] == "valid":
                return {"token": fallback, "error_type": None, "error_message": None}
            return {"token": None, "error_type": fb_result["status"], "error_message": fb_result["message"]}

        return {
            "token": None,
            "error_type": "no_token",
            "error_message": "GitLab requires a valid personal access token. Please provide one and try again.",
        }