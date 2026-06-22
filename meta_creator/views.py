"""
This module contains views and functions for handling metadata in the Meta Creator app.

It includes views for rendering templates, handling requests, and extracting metadata.
"""
import json
import os
import requests
from django.views.generic import TemplateView
from django.template import loader
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.core.exceptions import PermissionDenied
from django.http import HttpResponseServerError, HttpResponseForbidden
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from requests.exceptions import ConnectTimeout, ReadTimeout, RequestException
from .metadata_extractor import data_extraction
from .validate_jsonLD import validate_jsonld, validate_codemeta
from .init_curated_metadata import init_curated_metadata
from .import_metadata import parse_jsonld_file, validate_import_file, ImportError


class IndexView(TemplateView):
    template_name = 'meta_creator/index.html'


def homepage(request):
    return render(request, 'index.html')

def information(request):
    return render(request, 'meta_creator/information.html')

def legals(request):
    return render(request, 'meta_creator/legals.html')


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

        if not result.get('success'):
            errors = result.get('errors')
            if isinstance(errors, list):
                error_messages = ['Error in extraction:'] + errors
            else:
                error_messages = ['Error in extraction:', errors]
            return render(request, 'meta_creator/error.html', {
                'error_message': "; ".join(error_messages)
            })

 

        my_json_str = {}
        # Extract metadata
        extracted_metadata, description_metadata, type_metadata, joined_metadata = result['metadata']
        # Validate the JSON data
        is_valid_jsonld = validate_codemeta(joined_metadata)
        if is_valid_jsonld:
            validation_result = "The JSON data is a valid JSON-LD Codemeta object"
        else:
            validation_result = "The JSON data is not a valid JSON-LD Codemeta object"
        my_json_str = json.dumps(joined_metadata, indent=4)
        template = loader.get_template('meta_creator/showdata.html')
        return HttpResponse(template.render({
            "type_metadata": type_metadata,
            "description_metadata": description_metadata,
            "extracted_metadata": extracted_metadata,
            "my_json_str": my_json_str,
        }, request))

    except ConnectTimeout:
        error_message = "Connection timed out."
    except ReadTimeout:
        error_message = "Read operation timed out."
    except RequestException:
        error_message = "Error fetching data from GitHub API"
    except ConnectionError as conn_error:
        error_message = f"Could not establish a connection: {conn_error}"
    except PermissionDenied:
        error_message = "CSRF Error: This action is not allowed."
        return HttpResponseForbidden(error_message)


@csrf_exempt
@require_http_methods(["POST"])
def validate_jsonld_api(request):
    """Validate JSON-LD metadata before publishing.

    POST /meta_creator/api/validate-jsonld/
    Body: {"metadata": {...}}
    Response: {"is_valid": true} or {"is_valid": false, "error": "..."}
    """
    try:
        data = json.loads(request.body)
        metadata = data.get("metadata", {})
        is_valid, error = validate_jsonld(metadata)
        return JsonResponse({"is_valid": is_valid, "error": error})
    except json.JSONDecodeError:
        return JsonResponse({"is_valid": False, "error": "Invalid JSON in request body"}, status=400)

    return render(request, 'meta_creator/error.html', {'error_message': error_message})


def import_metadata(request):
    """
    View function for importing JSON-LD metadata from a file.

    Handles POST requests with an uploaded JSON-LD file, validates it,
    and loads it into the curation UI.

    Args:
        request (HttpRequest): The HTTP request object.

    Returns:
        HttpResponse: The HTTP response object.
    """
    if request.method == 'GET':
        from django.shortcuts import redirect
        return redirect('meta_creator:index')

    if request.method == 'POST':
        try:
            uploaded_file = request.FILES.get('jsonld_file')
            if not uploaded_file:
                return render(request, 'meta_creator/error.html', {
                    'error_message': "No file provided."
                })

            json_data = parse_jsonld_file(uploaded_file)

            is_valid, error_msg = validate_import_file(json_data)
            if not is_valid:
                return render(request, 'meta_creator/error.html', {
                    'error_message': f"Import validation failed: {error_msg}"
                })

            extracted_metadata, description_metadata, type_metadata, joined_metadata = \
                init_curated_metadata(json_data)

            is_valid_jsonld, validation_error = validate_jsonld(joined_metadata)
            if not is_valid_jsonld:
                return render(request, 'meta_creator/error.html', {
                    'error_message': f"JSON-LD validation failed: {validation_error}"
                })

            my_json_str = json.dumps(joined_metadata, indent=4)
            template = loader.get_template('meta_creator/showdata.html')
            return HttpResponse(template.render({
                "type_metadata": type_metadata,
                "description_metadata": description_metadata,
                "extracted_metadata": extracted_metadata,
                "my_json_str": my_json_str,
            }, request))

        except ImportError as e:
            return render(request, 'meta_creator/error.html', {
                'error_message': f"Import error: {str(e)}"
            })
        except Exception as unexpected_exception:
            error_message = f"An unexpected error occurred: {str(unexpected_exception)}"
            return HttpResponseServerError(error_message)


def from_registry(request):
    """
    Load existing software registry metadata into the curation UI.

    Called via GET from OEP when the user clicks 'Edit Metadata' on a software
    detail page. SMECS fetches the current metadata from the OEP API and loads
    it into the curation UI.

    Query params:
        registry_id: The URL-encoded software ID
        oep_api: Base URL of the OEP instance (e.g., http://web:8000) used for
                 server-to-server requests from inside the Docker network.
    """
    registry_id = request.GET.get('registry_id', '')
    oep_api = request.GET.get('oep_api', '')

    if not registry_id:
        return render(request, 'meta_creator/error.html', {
            'error_message': "Missing registry_id parameter."
        })

    if not oep_api:
        oep_api = os.environ.get('OEP_API_BASE', 'http://oeplatform:8000')

    oep_external_url = os.environ.get('OEP_EXTERNAL_URL', oep_api)

    try:
        api_url = f"{oep_api}/api/v1/software/{registry_id}/"
        response = requests.get(api_url, timeout=30)
        if response.status_code == 404:
            return render(request, 'meta_creator/error.html', {
                'error_message': f"Software '{registry_id}' not found in registry."
            })
        if response.status_code != 200:
            return render(request, 'meta_creator/error.html', {
                'error_message': f"Failed to fetch metadata from registry: HTTP {response.status_code}"
            })

        registry_metadata = response.json()
        extracted_metadata, description_metadata, type_metadata, joined_metadata = \
            init_curated_metadata(registry_metadata)

        do_validation = request.GET.get('do_validation', '').lower() in ('1', 'true', 'yes')
        if do_validation:
            is_valid_jsonld, validation_error = validate_jsonld(joined_metadata)
            if not is_valid_jsonld:
                return render(request, 'meta_creator/error.html', {
                    'error_message': f"Retrieved metadata is not valid JSON-LD: {validation_error}"
                })

        my_json_str = json.dumps(joined_metadata, indent=4)
        template = loader.get_template('meta_creator/showdata.html')
        return HttpResponse(template.render({
            "type_metadata": type_metadata,
            "description_metadata": description_metadata,
            "extracted_metadata": extracted_metadata,
            "my_json_str": my_json_str,
            "from_registry": True,
            "registry_id": registry_id,
            "oep_api": oep_external_url,
            "oep_external_url": oep_external_url,
        }, request))

    except ConnectTimeout:
        return render(request, 'meta_creator/error.html', {
            'error_message': "Connection timed out while fetching metadata from registry."
        })
    except RequestException as e:
        return render(request, 'meta_creator/error.html', {
            'error_message': f"Failed to connect to registry: {str(e)}"
        })
    except Exception as unexpected_exception:
        error_message = f"An unexpected error occurred: {str(unexpected_exception)}"
        return HttpResponseServerError(error_message)