"""
This module contains views and functions for handling metadata in the Meta Creator app.

It includes views for rendering templates, handling requests, and extracting metadata.
"""
import json
from django.views.generic import TemplateView
from django.template import loader
from django.http import HttpResponse
from django.shortcuts import render
from django.core.exceptions import PermissionDenied  # Import PermissionDenied
from django.http import HttpResponseServerError, HttpResponseForbidden
from requests.exceptions import ConnectTimeout, ReadTimeout, RequestException
from meta_creator.forms import CreatorForm
from .metadata_extractor import data_extraction
from .gitlab_metadata import count_non_empty_values, validate_codemeta

class IndexView(TemplateView):
    template_name = 'meta_creator/index.html'


class CreatorView(TemplateView):
    template_name = 'meta_creator/creator.html'
    metapath = None

    def get_context_data(self, **kwargs):
        return {'creator': CreatorForm(self.metapath.name)}

# Thesis_navigation to homepage and information page_based on requiremment analysis 
def homepage(request):
    return render(request, 'index.html')

def information(request):
    return render(request, 'meta_creator/information.html')

# Function for metadata extracting
def index(request):
    """
    View function for the index page.

    Handles the POST request and displays the form or extracted metadata.

    Args:
        request (HttpRequest): The HTTP request object.

    Returns:
        HttpResponse: The HTTP response object.

    """
    try:
        result = data_extraction(request)
        error_message_url = None
        error_message_token = None
        if result == 'Invalid URL':
            error_message_url = 'Invalid URL'
        if result == 'Invalid Personal Token Key':
            error_message_token = 'Invalid Personal Token Key'
        if result == 'Invalid GitHub URL':
            error_message_url = 'Invalid GitHub URL'
        errors = {
            "error_message_url": error_message_url,
            "error_message_token": error_message_token
        }

        if error_message_url or error_message_token:
            return render(request , 'meta_creator/index.html', errors)

        my_json_str = {}
        # Extract metadata
        extracted_metadata, entered_data = result
        count = count_non_empty_values(extracted_metadata)
        # Validate the JSON data
        is_valid_jsonld = validate_codemeta(extracted_metadata)
        if is_valid_jsonld:
            validation_result = "The JSON data is a valid JSON-LD Codemeta object"
        else:
            validation_result = "The JSON data is not a valid JSON-LD Codemeta object"
        # Convert the dictionary to JSON
        my_json_str = json.dumps(extracted_metadata, indent=4)
        template = loader.get_template('meta_creator/showdata.html')
        return HttpResponse(template.render({
            "entered_data":entered_data,
            "extracted_metadata":extracted_metadata,
            "my_json_str": my_json_str,
            "count": count,
            "validation_result": validation_result,
            }, request))

    except ConnectTimeout:
        error_message = "Connection timed out."
    except ReadTimeout:
        error_message = "Read operation timed out."
    except RequestException as e:
        error_message = "Error fetching data from GitHub API"
    except ConnectionError as conn_error:
        error_message = f"Could not establish a connection: {conn_error}"      
    except PermissionDenied:  # Catch PermissionDenied instead of CsrfViewMiddleware
        error_message = "CSRF Error: This action is not allowed."
        return HttpResponseForbidden(error_message)
    except Exception as unexpected_exception: # pylint: disable=broad-except
        error_message = f"An unexpected error occurred: {str(unexpected_exception)}"
        return HttpResponseServerError(error_message)  # Return 500 Internal Server Error   

    return render(request, 'meta_creator/error.html', {'error_message': error_message})
