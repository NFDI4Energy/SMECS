
import subprocess
import json
import os

def run_hermes_commands(url):
    # Step 1: Clean up any previous runs
    print("Running hermes clean...")
    clean_process = subprocess.run(['hermes', 'clean'], capture_output=True, text=True)
    if clean_process.returncode != 0:
        print(f"Error in clean command: {clean_process.stderr}")

    # Step 2: Run hermes harvest with the specified URL
    print("Running hermes harvest with URL...")
    harvest_process = subprocess.run(['hermes', 'harvest', '--path', url], capture_output=True, text=True)
    if harvest_process.returncode != 0:
        print(f"Error in harvest with URL: {harvest_process.stderr}")
        return None

    # Step 3: Run hermes process
    print("Running hermes process...")
    process_command = subprocess.run(['hermes', 'process'], capture_output=True, text=True)
    if process_command.returncode != 0:
        print(f"Error in hermes process: {process_command.stderr}")
        return None

    # Construct the path to hermes.json
    base_directory = os.getenv('HERMES_BASE_DIR', os.getcwd()) 
    hermes_json_path = os.path.join(base_directory, ".hermes", "process", "hermes.json")
    
    # Check if the hermes.json file exists
    if os.path.exists(hermes_json_path):
        with open(hermes_json_path, 'r') as json_file:
            hermes_metadata_dict = json.load(json_file)
    else:
        print("hermes.json file does not exist.")
        return None
    
    # TODO Refactor person metadata extraction into a reusable function for different roles (author, contributor, etc.)
    copyright_holder = hermes_metadata_dict.get('copyrightHolder', {}).get('name', '')

    # Authors
    author_info = hermes_metadata_dict.get('author', [])
    authors_metadata = [
        {
            "givenName": author.get("givenName", ""),
            "familyName": author.get("familyName", ""),
            "email": author.get("email", "")
        }
        for author in author_info
    ]

    # Contributors
    contributor_info = hermes_metadata_dict.get('contributor', [])
    contributors_metadata = [
        {
            "givenName": contributor.get("givenName", ""),
            "familyName": contributor.get("familyName", ""),
            "email": contributor.get("email", "")
        }
        for contributor in contributor_info
    ]

    hermes_metadata_dict = {
        "@context": "https://w3id.org/codemeta/3.0",
        "@type": "SoftwareSourceCode",
        "name": hermes_metadata_dict.get('name', ''),
        "identifier": hermes_metadata_dict.get('identifier', ''),
        "description": hermes_metadata_dict.get('description', ''),
        "codeRepository": hermes_metadata_dict.get('codeRepository', ''),
        "url": hermes_metadata_dict.get('url', ''),
        "issueTracker": hermes_metadata_dict.get('issueTracker', ''),
        "license": hermes_metadata_dict.get('license', ''),
        "programmingLanguage": hermes_metadata_dict.get('programmingLanguage', ['']),  
        "copyrightHolder": {"@type": "Person", "name": copyright_holder},
        "dateModified": hermes_metadata_dict.get('dateModified', ''),
        "dateCreated": hermes_metadata_dict.get('dateCreated', ''),
        "keywords": hermes_metadata_dict.get('keywords', ''),
        "downloadUrl": hermes_metadata_dict.get('downloadUrl', ''),
        "readme": hermes_metadata_dict.get('readme', ''),
        "developmentStatus": "",
        "version": hermes_metadata_dict.get('version', ''),
        "citation": hermes_metadata_dict.get('citation', ''),
        "applicationCategory":"",
        "referencePublication":"",
        "funding":"",
        "funder":"",
        "reviewAspect":"",
        "reviewBody":"",
        "continuousIntegration":"",
        "runtimePlatform":"",
        "operatingSystem":"",
        "softwareRequirements":"",
        "author": authors_metadata, 
        "contributor": contributors_metadata,    
    }
  
    return hermes_metadata_dict 

