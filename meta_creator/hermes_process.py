
import subprocess
import json
import os

def run_hermes_commands(url):
    errors = []
    warnings = []
    base_directory = os.getenv('HERMES_BASE_DIR', os.getcwd())

    # Step 1: Clean up any previous runs
    print("Running hermes clean...")
    clean_process = subprocess.run(['hermes', 'clean'], capture_output=True, text=True, cwd=base_directory)

    # Step 2: Run hermes harvest with the specified URL
    print("Running hermes harvest with URL...")
    harvest_process = subprocess.run(['hermes', 'harvest', '--path', url], capture_output=True, text=True, cwd=base_directory)
    found_validation_error = False
    
    hermes_dir = os.path.join(base_directory, ".hermes", "harvest")
    if not os.path.exists(hermes_dir) or not any(entry.is_file() for entry in os.scandir(hermes_dir)):
        error_msg = ".hermes directory contains no files — nothing harvested."
        print(error_msg)
        errors.append(error_msg)
        return {
            'success': False,
            'errors': errors,
            'warnings': warnings
        }

    if harvest_process.returncode != 0:
        log_path = os.path.join(base_directory, "hermes.log")
        warning_msg = f"Harvest failed: {harvest_process.stderr}"
        print(warning_msg)
        warnings.append(warning_msg)

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

        if found_validation_error:
            print(f"HermesValidationError detected — continuing despite harvest failure. Check {log_path} for details.")
            warnings.append("HermesValidationError occurred but ignored.")
        else:
            errors.append("Harvest failed with non-validation error.")
            return {
                'success': False,
                'errors': errors,
                'warnings': warnings
            }
        
    # Step 3: Run hermes process
    print("Running hermes process...")
    process_command = subprocess.run(['hermes', 'process'], capture_output=True, text=True, cwd=base_directory)
    if process_command.returncode != 0:
        error_msg = f"Error in hermes process: {process_command.stderr}"
        print(error_msg)
        errors.append(error_msg)
        return {
            'success': False,
            'errors': errors,
            'warnings': warnings
        }

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
            "contributor": contributors_metadata    
        }
    else:
        hermes_metadata_dict = {}

    return {
        'success': len(errors) == 0,
        'warnings': warnings,
        'errors': errors,
        'metadata': hermes_metadata_dict if hermes_metadata_dict else {}
    }

