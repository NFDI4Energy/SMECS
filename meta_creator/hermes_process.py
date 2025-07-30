
import subprocess
import json
import os
from .token_handling_in_toml import update_token_to_toml, remove_token_from_toml

def run_hermes_commands(url, token=None):
    errors = []
    warnings = []
    base_directory = os.getenv('HERMES_BASE_DIR', os.getcwd())
    
    if token:
        update_token_to_toml(token)

    # Step 1: Clean up any previous runs
    print("Running hermes clean...")
    clean_process = subprocess.run(['hermes', 'clean'], capture_output=True, text=True, cwd=base_directory)

    # Step 2: Run hermes harvest with the specified URL
    print("Running hermes harvest with URL...")
    harvest_process = subprocess.run(['hermes', 'harvest', '--path', url], capture_output=True, text=True, cwd=base_directory)
    
    hermes_dir = os.path.join(base_directory, ".hermes", "harvest")
    # Print harvested files
    print("Harvested files:")
    for entry in os.scandir(hermes_dir):
        if entry.is_file():
            print(f" - {entry.name}")
            
    files_exist = os.path.exists(hermes_dir) and any(entry.is_file() for entry in os.scandir(hermes_dir))

    if not files_exist:
        error_msg = ".hermes directory contains no files — nothing harvested."
        print(error_msg)
        errors.append(error_msg)
        return {
            'metadata': {"codeRepository": url },
            'success': False,
            'errors': errors,
            'warnings': warnings
        }

    # Only check for warnings or log messages if harvest failed,
    # but still proceed to Step 3 if files are available
    if harvest_process.returncode != 0:
        log_path = os.path.join(base_directory, "hermes.log")
        warning_msg = f"Harvest failed (non-zero exit): {harvest_process.stderr}"
        print(warning_msg)
        warnings.append(warning_msg)

        found_validation_error = False
        if os.path.exists(log_path):
            with open(log_path, 'r') as log_file:
                error_lines = []
                for line in log_file:
                    if "ERROR |" in line:
                        error_lines.append(line.strip())
                    if "HermesValidationError" in line or "Error while executing" in line:
                        found_validation_error = True

                if error_lines:
                    warnings.append("\n".join(error_lines))
                else:
                    warnings.append("No error lines found in hermes.log.")
        else:
            warnings.append("hermes.log file does not exist.")

        if not found_validation_error:
            # Only treat as fatal if there are no files harvested
            warnings.append("Non-validation error occurred, but files were found. Proceeding.")

    # Step 3: Run hermes process
    print("Running hermes process...")
    process_command = subprocess.run(['hermes', 'process'], capture_output=True, text=True, cwd=base_directory)
    
    ## Check result and create correct path
    if process_command.returncode != 0:
        error_msg = f"Error in hermes process: {process_command.stderr}"
        print(error_msg)
        errors.append(error_msg)
        file_names = ["codemeta.json", "cff.json", "githublab.json"]
        for file_name in file_names:
            file_path = os.path.join(base_directory, ".hermes", "harvest", file_name)
            os.remove(file_path)
            print(f"Removed {file_path}")
            process_command = subprocess.run(['hermes', 'process'], capture_output=True, text=True, cwd=base_directory)

            if process_command.returncode == 0:
                break

        if process_command.returncode != 0:
            errors.append(error_msg)
            return {
                'metadata': {"codeRepository": url },
                'success': False,
                'errors': errors,
                'warnings': warnings
            }
        else:
            errors = []

    # Construct the path to hermes.json
    hermes_json_path = os.path.join(base_directory, ".hermes", "process", "hermes.json")
    if not os.path.exists(hermes_json_path):
        error_msg = "hermes.json file does not exist."
        print(error_msg)
        errors.append(error_msg)
        return {
            'success': False,
            'errors': errors,
            'warnings': warnings
        }

    with open(hermes_json_path, 'r') as json_file:
        hermes_metadata_dict = json.load(json_file)

    # Extract metadata
    # TODO Refactor person metadata extraction into a reusable function for different roles (author, contributor, etc.)
    if hermes_metadata_dict:
        copyright_holder = hermes_metadata_dict.get('copyrightHolder', {}).get('name', '')

        # Authors
        author_info = hermes_metadata_dict.get('author', [])
        authors_metadata = [
            {
                "@type": "Person",
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
                "@type": "Person",
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
            "version": hermes_metadata_dict.get('version', ''),
            "citation": hermes_metadata_dict.get('citation', ''),
            "author": authors_metadata, 
            "contributor": contributors_metadata    
        }
    else:
        hermes_metadata_dict = {}
        
    if token:
        remove_token_from_toml('hermes.toml')

    return {
        'success': len(errors) == 0,
        'warnings': warnings,
        'errors': errors,
        'metadata': hermes_metadata_dict if hermes_metadata_dict else {}
    }

