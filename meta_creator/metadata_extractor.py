"""
This module provides functions for extracting metadata from GitHub repositories through HERMES processes.
"""

from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .url_check_GitHub import validate_github_inputs
from .read_tokens import read_token_from_file
from .hermes_process import run_hermes_commands
import json
import os


# Load descriptions from the Schema
def load_description_dict_from_schema():
    schema_path = os.path.join(settings.BASE_DIR, 'static', 'schema', 'codemeta_schema.json')
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema = json.load(f)

    properties = schema.get("properties", {})
    description_dict = {}

    for key, value in properties.items():
        if "description" in value:
            description_dict[key] = value["description"]

    return description_dict

# Harvesting metadata via HERMES 
@csrf_exempt
def data_extraction(request):
    if request.method == 'POST':
        # getting values from post
        project_name = request.POST.get('project_name')
        gl_url = request.POST.get('gl_url')
        personal_token_key = request.POST.get('personal_token_key')
        context = {
                    'gl_url': gl_url,
                    'project_name': project_name,
                    'description_dict': load_description_dict_from_schema()
                }

        is_valid_github, error_messages = validate_github_inputs(gl_url)
        
        if not is_valid_github:
            return {
                'success': False,
                'error_message': error_messages
            }

        tokens = read_token_from_file('tokens.txt')
        # TODO we need to pass the token to hermes_process
        default_access_token_GH = tokens.get('github_token')

        hermes_metadata = run_hermes_commands(gl_url)
        return {
            'success': True,
            'context': context,
            'hermes_metadata': hermes_metadata
        }