from django.views.generic import TemplateView
from django import forms
from django.template import loader
from django.http import HttpResponse
import json
from .metadata_extractor import data_extraction, count_non_empty_values
from meta_creator.settings import META_VERSIONS
from meta_creator.forms import CreatorForm
from django.shortcuts import render


class IndexView(TemplateView):
    template_name = 'meta_creator/index.html'
    extra_context = {"versions": META_VERSIONS.keys()}


class CreatorView(TemplateView):
    template_name = 'meta_creator/creator.html'
    metapath = None

    def get_context_data(self, **kwargs):
        return {'creator': CreatorForm(self.metapath.name)}

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
    result = data_extraction(request)
    error_message_url = None
    error_message_token = None

    if result == 'Invalid GitLab URL':
        error_message_url = 'Invalid GitLab URL'
    if result == 'Invalid Personal Token Key':
        error_message_token = 'Invalid Personal Token Key'
    errors = {
        "error_message_url": error_message_url,
        "error_message_token": error_message_token
    }

    if error_message_url or error_message_token:
        return render(request , 'meta_creator/index.html', errors)

    # if request.method == 'POST':
    my_json_str = {}
    # Extract metadata
    extracted_metadata, entered_data = result
    count = count_non_empty_values(extracted_metadata)
    # Convert the dictionary to JSON
    my_json_str = json.dumps(extracted_metadata, indent=4)
    template = loader.get_template('meta_creator/showdata.html')
    return HttpResponse(template.render({
        "entered_data":entered_data,
        "extracted_metadata":extracted_metadata,
        "my_json_str": my_json_str,
        "count": count,
        }, request))

# View function for downloading metadata as JSON
# def download_json(request):
#     global my_json_str
#     # Create a response object with the JSON data and the appropriate content type
#     response = HttpResponse(my_json_str, content_type='application/json')
#     # Set the Content-Disposition header to specify the filename
#     response['Content-Disposition'] = 'attachment; filename="metadata.json"'
#     return response
