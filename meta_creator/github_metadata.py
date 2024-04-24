import re
import requests
import json

from .common_functions import findWord
from .read_tokens import read_token_from_file
from .count_extracted_metadata import count_non_empty_values
from .validate_jsonLD import validate_codemeta

# Check the URL to be accessible or not
def is_url_accessible(url):
    try:
        response = requests.head(url, timeout=5)
        return response.status_code == 200
    except requests.ConnectionError:
        return False

# Creating download_URL of the Repository
def download_url_releases(url):
    if url.endswith('/'):
        url = url[:-1]

    download_url = f"{url}/releases"

    if is_url_accessible(download_url):
        return download_url
    else:
        return ""


# Function to extract contributors from commit history
def get_contributors_from_repo(owner, repo, token, url):
    # url = f"https://api.github.com/repos/{owner}/{repo}/commits"
    url_contributors = f"{url}/commits"
    headers = {"Authorization": f"token {token}"}
    response = requests.get(url_contributors, headers=headers)
    if token == '':
        response = requests.get(url_contributors)
    
    if response.status_code == 200:
        commit_data = response.json()
        metadata = []
        seen_names = set()
        for commit in commit_data:
            contributor_name = commit["commit"]["author"]["name"]
            contributor_email = commit["commit"]["author"]["email"]
            if contributor_name not in seen_names: 
                name_parts = contributor_name.split()
                given_name = name_parts[0]
                # Combine the rest of the name parts as the family name
                family_name = ' '.join(name_parts[1:])
                metadata.append({
                    "givenName": given_name,
                    "familyName": family_name,
                    "email": contributor_email,
                })
                seen_names.add(contributor_name) # to return unique metadata
        return metadata
    else:
        print(f"Failed to retrieve commit history: {response.status_code}")
        return None


def get_github_metadata(url, personal_token_key):
    # Check if the URL matches the modified GitHub repository pattern
    pattern = re.compile(r'https?://github\.com/([a-zA-Z0-9-]+)/([a-zA-Z0-9-_]+)')
    match = pattern.match(url)

    if not match:
        return None  # URL doesn't match the GitHub repository pattern

    # Extract username and repository name
    username, repo_name = match.group(1), match.group(2)

    # Fetch repository information from GitHub API
    api_url = f'https://api.github.com/repos/{username}/{repo_name}'

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
        "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
        "@type": "SoftwareSourceCode",
        "name": full_name,
        "identifier": identifier,
        "description": description,
        "codeRepository": code_repository,
        "url": code_repository,
        # "id": code_repository,
        "issueTracker": issue_tracker,
        "license": license_value,
        # "version": version,
        "programmingLanguage": programming_languages,  # List of all languages used
        "copyrightHolder": {"@type": "Person", "name": ""},
        "dateModified": dateModified,
        "dateCreated": dateCreated,
        # "publisher": namespaceName,
        "keywords": topics,
        "downloadUrl": download_url,
        "permissions": "",
        "readme": readme_url,
        "author": [{"@type": "Person",
                    "givenName": "",
                    "familyName": ""
                    }],
        "contributor": contributors_metadata,
    }
    return metadata_dict