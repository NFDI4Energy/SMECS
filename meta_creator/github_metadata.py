import re
import requests
import json

from .common_functions import findWord
from .read_tokens import read_token_from_file
from .validate_jsonLD import validate_codemeta

from urllib.parse import urlparse

def get_api_url(owner, repo, url):
    """
    Returns the appropriate GitHub API URL for a given repository.
    If the URL ends with '.github.io', it's assumed to be a GitHub Pages repository.
    """
    if url.endswith('.github.io'):
        return f'https://api.github.com/repos/{owner}/{repo}.github.io'
    else:
        return f'https://api.github.com/repos/{owner}/{repo}'
    

# Check the URL to be accessible or not
def is_url_accessible(url):
    """
    Checks if a URL is accessible by sending a HEAD request.
    Args:
        url (str): The URL to check.
        timeout (int): Timeout in seconds for the request.
    Returns:
        bool: True if the URL is accessible (status code 200), False otherwise.
    """
    try:
        response = requests.head(url, timeout=5)
        return response.status_code == 200
    except requests.ConnectionError:
        return False

# Creating download_URL of the Repository
def download_url_releases(url):
    """
    Constructs a releases URL for the given base GitHub repository URL
    and checks if it is accessible.

    Args:
        url (str): The base GitHub repository URL.

    Returns:
        str: The releases URL if accessible, otherwise an empty string.
    """
    if url.endswith('/'):
        url = url[:-1]

    download_url = f"{url}/releases"

    if is_url_accessible(download_url):
        return download_url
    else:
        return ""


# Function to extract contributors from commit history with pagination
def get_contributors_from_repo(owner, repo, token, url):
    """
    Retrieves unique contributors from a GitHub repository by analyzing the commit history.
    Args:
        owner (str): Repository owner's username.
        repo (str): Repository name.
        token (Optional[str]): GitHub personal access token for authenticated requests.
        url (str): Base GitHub API URL for the repository.
    Returns:
        A list of dictionaries with contributor metadata or None on failure.
    """
    url_contributors = f"{url}/commits"
    headers = {"Authorization": f"token {token}"} if token else {}

    all_commits = []
    page = 1

    while True:
        response = requests.get(f"{url_contributors}?per_page=100&page={page}", headers=headers)
        
        if response.status_code != 200:
            print(f"Failed to retrieve commit history: {response.status_code}")
            return None
        
        commit_data = response.json()
        if not commit_data:
            break
        
        all_commits.extend(commit_data)
        page += 1

    # Extract metadata from all commits
    metadata = []
    seen_emails = set()

    for commit in all_commits:
        if "commit" in commit and "author" in commit["commit"]:
            contributor_name = commit["commit"]["author"]["name"]
            contributor_email = commit["commit"]["author"]["email"].lower()
            
            if contributor_email not in seen_emails:
                cleaned_name = re.sub(r'[^a-zA-Z\s]', '', contributor_name)
                name_parts = cleaned_name.split()
                given_name = name_parts[0]
                family_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''

                metadata.append({
                    "givenName": given_name,
                    "familyName": family_name,
                    "email": contributor_email,
                })
                seen_emails.add(contributor_email)
    sorted_metadata = sorted(metadata, key=lambda x: x['givenName'].lower())
    return sorted_metadata


def get_github_metadata(url, personal_token_key):
    """
    Fetches metadata from a GitHub repository and returns it in CodeMeta format.
    Args:
        url (str): The GitHub repository URL (e.g., https://github.com/user/repo).
        personal_token_key (Optional[str]): A personal GitHub token for authentication.
    Returns:
        A dictionary representing the metadata in CodeMeta format,
        or None if the repository is inaccessible or invalid.
    """
    # Check if the URL matches the modified GitHub repository pattern
    pattern = re.compile(r'https?://github\.com/([a-zA-Z0-9-]+)/([a-zA-Z0-9-_]+)')
    match = pattern.match(url)
    end = url.split('/')[-1]

    if not match:
        return None  # URL doesn't match the GitHub repository pattern

    # Extract username and repository name
    username, repo_name = match.group(1), match.group(2)

    # Fetch repository information from GitHub API
    api_url = get_api_url(username,repo_name,url)

    # token_file_path = 'tokens.txt'  # Specify the path to external text file containing the default GH token
    tokens = read_token_from_file('tokens.txt')
    default_access_token = tokens.get('github_token') # Read the default GH token from the external text file

    headers = {'Authorization': f'token {personal_token_key}'}
    response = requests.get(api_url, headers=headers, timeout=5)
     
    if response.status_code != 200 or not personal_token_key:
        # Using default token when user token is wrong or input is empty
        headers = {'Authorization': f'token {default_access_token}'}
        response = requests.get(api_url, headers=headers, timeout=5)
        default_access_token_response = response # check if default GH token is correct
        if default_access_token_response.status_code != 200:
            response = requests.get(api_url, timeout=5)


    response.raise_for_status()
    repo_data = response.json()

    full_name = repo_data['full_name']
    identifier = str(repo_data['id'])

    description = repo_data['description']
    if description is None:
        description = ""

    code_repository = repo_data['html_url']
    # issue_tracker = repo_data['issues_url'].replace('{/number}', '')
    issue_tracker = code_repository + '/issues'
    login = repo_data['owner']['login']
    topics = list(repo_data['topics'])

    projectString = str(repo_data)
    dateModified = findWord("'updated_at'", 15, projectString)
    dateModified = dateModified[0:dateModified.find("T")]
    dateCreated = findWord("'created_at'", 15, projectString)
    dateCreated = dateCreated[0:dateCreated.find("T")]

    # Check if 'languages_url' is present in the response
    if 'languages_url' not in repo_data:
        print(f"Error: 'languages_url' not found in the API response.")
        return None

    # Fetch language data from the languages_url
    languages_url = repo_data['languages_url']
    if languages_url:
        languages_response = requests.get(languages_url)
        languages_response.raise_for_status()
        languages_data = languages_response.json()
        programming_languages = list(languages_data.keys())
    else:
        print(f"Error: 'languages_url' not found in the API response.")
        return None

    license_value = repo_data['license']['name'] if repo_data['license'] else ""
    download_url = download_url_releases(url)

    url_readme = code_repository.replace("https://github.com/", "")
    # readme = f"https://github.com/{username}/{repo_name}/blob/master/README.md"
    readme_url = f"https://raw.githubusercontent.com/{url_readme}/master/README.md"

    contributors_metadata = get_contributors_from_repo(username, repo_name, personal_token_key, api_url)
    token = ''
    if contributors_metadata is None:
        contributors_metadata = get_contributors_from_repo(username, repo_name, default_access_token, api_url)
        if not contributors_metadata:
            contributors_metadata = get_contributors_from_repo(username, repo_name, token, api_url)

    # Extract relevant metadata
    metadata_dict = {
        "@context": "https://w3id.org/codemeta/3.0",
        "@type": "SoftwareSourceCode",
        "name": full_name,
        "identifier": identifier,
        "description": description,
        "codeRepository": code_repository,
        "url": code_repository,
        "issueTracker": issue_tracker,
        "license": license_value,
        "programmingLanguage": programming_languages,  # List of all languages used
        "dateModified": dateModified,
        "dateCreated": dateCreated,
         "copyrightHolder": {"@type": "Person", "name": ""},
        "keywords": topics,
        "downloadUrl": download_url,
        "readme": readme_url,
        "author": [{"@type": "Person",
                    "givenName": "",
                    "familyName": "",
                    "email":""
                    }],
        "contributor": contributors_metadata,
    }
    return metadata_dict