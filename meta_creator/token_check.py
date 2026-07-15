import requests
import json
import os
from urllib.parse import urlparse


def load_tokens_from_file(file_path="tokens.txt"):
    if not os.path.exists(file_path):
        return {}
    with open(file_path, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def classify_url(url):
    """
    Parses a repository URL and identifies the forge type from the domain only.

    Returns:
        dict with keys:
            'forge'    — 'github_com' | 'github_enterprise' | 'gitlab_com' |
                         'gitlab_self_hosted' | 'unknown'
            'domain'   — netloc string (lowercased)
            'base_url' — scheme + netloc
            'owner'    — first path segment or None
            'repo'     — second path segment or None
    """
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        path_parts = [p for p in parsed.path.strip("/").split("/") if p]
        owner = path_parts[0] if len(path_parts) >= 1 else None
        repo = path_parts[1] if len(path_parts) >= 2 else None
        base = {
            "domain": domain,
            "base_url": f"{parsed.scheme}://{domain}",
            "owner": owner,
            "repo": repo,
        }
        if domain == "github.com":
            return {**base, "forge": "github_com"}
        elif "github" in domain:
            # Covers github.company.com, code.org.github.com, etc.
            return {**base, "forge": "github_enterprise"}
        elif domain == "gitlab.com":
            return {**base, "forge": "gitlab_com"}
        elif "gitlab" in domain:
            # Covers gitlab.org.org, git.org.de with gitlab in name, etc.
            return {**base, "forge": "gitlab_self_hosted"}
        else:
            return {**base, "forge": "unknown"}
    except Exception:
        return {
            "forge": "unknown",
            "domain": None,
            "base_url": None,
            "owner": None,
            "repo": None,
        }


def probe_is_gitlab(base_url):
    """
    Confirms an unknown host is a GitLab instance by probing /api/v4/version.
    A 200 or 401 response means the GitLab API is present.
    """
    try:
        r = requests.get(f"{base_url}/api/v4/version", timeout=5)
        return r.status_code in (200, 401)
    except requests.RequestException:
        return False


def _build_github_api_url(classified):
    """
    Constructs the correct GitHub REST API URL from a classified URL dict.
    github.com  → https://api.github.com/repos/{owner}/{repo}
    Enterprise  → https://{host}/api/v3/repos/{owner}/{repo}
    Returns None if owner or repo could not be extracted.
    """
    owner, repo = classified["owner"], classified["repo"]
    if not owner or not repo:
        return None
    if classified["forge"] == "github_com":
        return f"https://api.github.com/repos/{owner}/{repo}"
    return f"{classified['base_url']}/api/v3/repos/{owner}/{repo}"


def check_github_token(repo_url, token):
    """
    Validates a GitHub token and URL against the GitHub API.
    Supports github.com and GitHub Enterprise Server instances.

    Returns:
        dict with keys 'status' and 'message'.
        status values: 'valid', 'invalid_token', 'expired_token', 'invalid_url', 'error'
    """
    classified = classify_url(repo_url)
    domain = classified["domain"]
    api_url = _build_github_api_url(classified)

    if not api_url:
        return {
            "status": "invalid_url",
            "message": "Invalid GitHub repository URL: could not extract owner and repository name.",
        }

    headers = {"Authorization": f"token {token}"} if token else {}

    try:
        response = requests.get(api_url, headers=headers)
    except requests.RequestException as e:
        return {"status": "error", "message": f"Network error while reaching {domain}: {str(e)}"}

    if response.status_code == 200:
        return {"status": "valid", "message": ""}

    if response.status_code == 401:
        # GitHub API returns "Bad credentials" for both invalid and expired tokens —
        # it does not expose expiry state in the 401 body for classic PATs (ghp_...).
        # We surface a message that covers both cases.
        return {
            "status": "invalid_token",
            "message": f"The provided GitHub token is invalid or has expired for {domain}. Please check your token or generate a new one and try again.",
        }

    if response.status_code == 404:
        return {
            "status": "invalid_url",
            "message": f"GitHub repository not found on {domain}. Please check the URL and try again.",
        }

    if response.status_code == 403:
        return {
            "status": "error",
            "message": f"Access to {domain} is forbidden. You may have exceeded the API rate limit.",
        }

    return {
        "status": "error",
        "message": f"Unexpected response from GitHub API on {domain} (HTTP {response.status_code}).",
    }


def check_gitlab_token(repo_url, token):
    """
    Validates a GitLab token and URL against the GitLab API.
    Works for gitlab.com and self-hosted GitLab instances.

    Returns:
        dict with keys 'status' and 'message'.
        status values: 'valid', 'invalid_token', 'expired_token', 'invalid_url', 'error'
    """
    classified = classify_url(repo_url)
    domain = classified["domain"]
    base_url = classified["base_url"]
    is_self_hosted = classified["forge"] == "gitlab_self_hosted"

    try:
        parsed = urlparse(repo_url)
        raw_path = parsed.path.strip("/")
        if not raw_path:
            return {"status": "invalid_url", "message": "Invalid GitLab repository URL: no path found."}
        project_path = raw_path.replace("/", "%2F")
        api_url = f"{base_url}/api/v4/projects/{project_path}"
    except Exception:
        return {"status": "invalid_url", "message": "Invalid GitLab repository URL format."}

    headers = {"PRIVATE-TOKEN": token} if token else {}

    try:
        response = requests.get(api_url, headers=headers)
        print(f"[GitLab API] HTTP {response.status_code} → {api_url}")
    except requests.exceptions.SSLError:
        return {
            "status": "error",
            "message": f"SSL certificate error on {domain}. The server may use a self-signed certificate.",
        }
    except requests.RequestException as e:
        return {"status": "error", "message": f"Network error while reaching {domain}: {str(e)}"}

    if response.status_code == 200:
        return {"status": "valid", "message": ""}

    if response.status_code == 401:
        try:
            body = response.json()
            error_desc = body.get("error_description", "") or body.get("message", "")
            if "expired" in error_desc.lower():
                return {
                    "status": "expired_token",
                    "message": (
                        f"The token for {domain} has expired. Please generate a new token on {domain} and try again."
                        if is_self_hosted
                        else "The GitLab token has expired. Please generate a new token and try again."
                    ),
                }
        except Exception:
            pass
        return {
            "status": "invalid_token",
            "message": (
                f"The token is invalid for {domain}. Make sure you are using a token created on {domain}."
                if is_self_hosted
                else "The provided GitLab token is invalid. Please check your token and try again."
            ),
        }

    if response.status_code == 404:
        return {
            "status": "invalid_url",
            "message": (
                f"Repository not found on {domain}. Please check the URL and try again."
                if is_self_hosted
                else "GitLab repository not found. Please check the URL and try again."
            ),
        }

    if response.status_code == 403:
        return {
            "status": "error",
            "message": (
                f"Access forbidden on {domain}. Your token may not have the required permissions."
                if is_self_hosted
                else "Access to the GitLab repository is forbidden."
            ),
        }

    return {
        "status": "error",
        "message": f"Unexpected response from GitLab API on {domain} (HTTP {response.status_code}).",
    }


def _self_hosted_unsupported_message(domain):
    return (
        f"We are working on extracting from self-hosted repositories and soon "
        f"you can extract metadata from {domain}."
    )


def validate_token(repo_url, token):
    """
    Validates the given token (or a fallback from file) for the given repository URL.

    Returns:
        dict: {
            'token'        : str or None — the valid token to use for subsequent requests,
            'error_type'   : str or None — one of 'invalid_token', 'expired_token',
                                           'invalid_url', 'no_token', 'error',
                                           'self_hosted_unsupported', 'unsupported_forge',
            'error_message': str or None — human-readable error for the user,
            'forge'        : str         — 'github_com', 'github_enterprise',
                                           'gitlab_com', 'gitlab_self_hosted', or 'unknown'
        }
    """
    classified = classify_url(repo_url)
    forge = classified["forge"]
    domain = classified["domain"]
    tokens_from_file = load_tokens_from_file()

    def _ok(tok):
        return {"token": tok, "error_type": None, "error_message": None, "forge": forge}

    def _err(error_type, message):
        return {"token": None, "error_type": error_type, "error_message": message, "forge": forge}

    # For unknown domains, probe the host before giving up — it may be a
    # self-hosted GitLab instance without "gitlab" in the domain name.
    if forge == "unknown":
        if classified["base_url"] and probe_is_gitlab(classified["base_url"]):
            classified["forge"] = "gitlab_self_hosted"
            forge = "gitlab_self_hosted"
        else:
            return _err(
                "unsupported_forge",
                f"Unsupported repository host: {domain}. Only GitHub and GitLab instances are currently supported.",
            )

    # --- GitHub (github.com + GitHub Enterprise Server) ---
    if forge in ("github_com", "github_enterprise"):
        if token:
            result = check_github_token(repo_url, token)
            if result["status"] == "valid":
                return _ok(token)

            if result["status"] in ("invalid_token", "expired_token"):
                fallback = tokens_from_file.get("github_token")
                if fallback and fallback != token:
                    fb_result = check_github_token(repo_url, fallback)
                    if fb_result["status"] == "valid":
                        return _ok(fallback)
                # Both tokens failed — surface the user token's error (more actionable)
                return _err(result["status"], result["message"])

            # URL invalid or unexpected error
            return _err(result["status"], result["message"])

        # No token — try file fallback, then anonymous (public repos)
        fallback = tokens_from_file.get("github_token")
        if fallback:
            fb_result = check_github_token(repo_url, fallback)
            if fb_result["status"] == "valid":
                return _ok(fallback)
            if fb_result["status"] == "invalid_url":
                return _err("invalid_url", fb_result["message"])

        url_check = check_github_token(repo_url, None)
        if url_check["status"] == "invalid_url":
            return _err("invalid_url", url_check["message"])

        return _ok(None)  # public repo, no token needed

    # --- GitLab (gitlab.com + self-hosted) ---
    if token:
        result = check_gitlab_token(repo_url, token)
        if result["status"] == "valid":
            if forge == "gitlab_self_hosted":
                return {
                    "token": token,
                    "error_type": "self_hosted_unsupported",
                    "error_message": _self_hosted_unsupported_message(domain),
                    "forge": forge,
                }
            return _ok(token)

        if result["status"] in ("invalid_token", "expired_token"):
            fallback = tokens_from_file.get("gitlab_token")
            if fallback and fallback != token:
                fb_result = check_gitlab_token(repo_url, fallback)
                if fb_result["status"] == "valid":
                    if forge == "gitlab_self_hosted":
                        return {
                            "token": fallback,
                            "error_type": "self_hosted_unsupported",
                            "error_message": _self_hosted_unsupported_message(domain),
                            "forge": forge,
                        }
                    return _ok(fallback)
            return _err(result["status"], result["message"])

        return _err(result["status"], result["message"])

    # No token — try file fallback
    fallback = tokens_from_file.get("gitlab_token")
    if fallback:
        fb_result = check_gitlab_token(repo_url, fallback)
        if fb_result["status"] == "valid":
            if forge == "gitlab_self_hosted":
                return {
                    "token": fallback,
                    "error_type": "self_hosted_unsupported",
                    "error_message": _self_hosted_unsupported_message(domain),
                    "forge": forge,
                }
            return _ok(fallback)
        return _err(fb_result["status"], fb_result["message"])

    return _err(
        "no_token",
        "GitLab requires a valid personal access token. Please provide one and try again.",
    )
