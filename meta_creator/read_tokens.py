import json

# Function to read GitLab or GitHub token from external file
def read_token_from_file(file_path):
    with open(file_path, 'r') as file:
        tokens = json.load(file)
    return tokens
