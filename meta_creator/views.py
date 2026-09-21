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
from .metadata_extractor import data_extraction
from .validate_jsonLD import validate_codemeta
from .forms import CaptchaForm
from django.shortcuts import render, redirect
from django.contrib import messages

URL_FIELD_ERRORS   = {"invalid_url", "unsupported_forge"}
TOKEN_FIELD_ERRORS = {"invalid_token", "expired_token", "no_token"}
LANDING_PAGE_ERRORS = URL_FIELD_ERRORS | TOKEN_FIELD_ERRORS

class IndexView(TemplateView):
    template_name = 'meta_creator/index.html'
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['captcha_form'] = CaptchaForm() 
        return context


# navigation to homepage and information page_based on requiremment analysis 
def homepage(request):
    return render(request, 'index.html')

def information(request):
    return render(request, 'meta_creator/information.html')

def legals(request):
    return render(request, 'meta_creator/legals.html')

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
    captcha_form = CaptchaForm(request.POST or None)

     # Handle GET request - just show the form
    if request.method == "GET":
        return render(request, 'meta_creator/index.html', {
            "captcha_form": captcha_form,
        })

    # Handle POST request
    if request.method == "POST":

        if not captcha_form.is_valid():
          messages.error(request, "Invalid Captcha. Please try again.")
          return redirect('meta_creator:index')

        # Captcha is valid, proceed with extraction
        try:
            result = data_extraction(request)

            # if not result.get('success'):
            #     errors = result.get('errors')
            #     if isinstance(errors, list):
            #         error_messages = ['Error in extraction:'] + errors
            #     else:
            #         error_messages = ['Error in extraction:', errors]
            #     return render(request, 'meta_creator/error.html', {
            #         'error_message': " ".join(error_messages)
            #     })
            if not result.get('success'):
                error_type = result.get('error_type')
                errors = result.get('errors')
                error_message = "; ".join(errors) if isinstance(errors, list) else (errors or "An unknown error occurred.")

                # Landing-page errors → re-render the form with the message beside the right field
                if error_type in LANDING_PAGE_ERRORS:
                    context = {
                        "captcha_form": CaptchaForm(),
                        "repo_url": request.POST.get("repo_url", ""),
                    }
                    if error_type in URL_FIELD_ERRORS:
                        context["error_message_url"] = error_message
                    else:
                        context["error_message_token"] = error_message
                    return render(request, 'meta_creator/index.html', context)

                # Everything else → dedicated error page
                return render(request, 'meta_creator/error.html', {
                    'error_message': f"Error in extraction: {error_message}"
                })

            extracted_metadata, description_metadata, type_metadata, joined_metadata = result['metadata']
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
                "from_showdata": True,
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
        except Exception as unexpected_exception:
            error_message = f"An unexpected error occurred: {str(unexpected_exception)}"
            return HttpResponseServerError(error_message)

        return render(request, 'meta_creator/error.html', {'error_message': error_message})