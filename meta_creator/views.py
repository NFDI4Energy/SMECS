"""
This module contains views and functions for handling metadata in the Meta Creator app.

It includes views for rendering templates, handling requests, and extracting metadata.
"""

import base64
import json

from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.core.files.uploadedfile import SimpleUploadedFile
from django.http import HttpResponse, HttpResponseForbidden, HttpResponseServerError
from django.shortcuts import render
from django.template import loader
from django.views.generic import TemplateView
from requests.exceptions import ConnectTimeout, ReadTimeout, RequestException

from .forms import CaptchaForm
from .metadata_extractor import data_extraction
from .metadata_paster import load_pasted_metadata
from .validate_jsonLD import validate_codemeta


# Session key used to temporarily store an uploaded metadata file (name and
# base64-encoded content) so it can be restored if a CAPTCHA validation fails.
STAGED_METADATA_FILE_SESSION_KEY = "staged_metadata_file"

def _stage_uploaded_file(request):
    """
    Keep a file available for a CAPTCHA retry in this user's session.
    """
    uploaded_file = request.FILES.get("metadata_file")
    if uploaded_file:
        # Store a small representation of the file in the user's session so
        # it can be reconstituted later if CAPTCHA validation fails.
        request.session[STAGED_METADATA_FILE_SESSION_KEY] = {
            "name": uploaded_file.name,
            "content": base64.b64encode(uploaded_file.read()).decode("ascii"),
        }


def _get_staged_uploaded_file(request):
    """
    Recreate the file staged by a failed CAPTCHA attempt, if present.
    """
    # Retrieve the staged file metadata from the user's session. The stored
    # representation is a small dict containing the original filename and the
    # file content encoded as base64 text (so it is JSON-serializable).
    staged_file = request.session.get(STAGED_METADATA_FILE_SESSION_KEY)

    # If there is no staged file information, nothing to recreate.
    if not staged_file:
        return None

    try:
        # Decode the base64-encoded content back to bytes and create a SimpleUploadedFile instance
        # that behaves like an uploaded file in Django request.FILES.
        return SimpleUploadedFile(
            staged_file["name"],
            base64.b64decode(staged_file["content"]),
            content_type="application/json",
        )
    except (KeyError, TypeError, ValueError):
        # If the stored structure is malformed or decoding fails, remove the
        # bad session entry to avoid repeated failures and return None.
        request.session.pop(STAGED_METADATA_FILE_SESSION_KEY, None)
        return None


def _index_context(request, captcha_form):
    """
    Return the start-form context while retaining non-CAPTCHA input.
    """
    # Retrieve any previously staged uploaded file info so the filename can
    # be displayed back to the user (useful when a CAPTCHA validation fails
    # and the upload was preserved in the session).
    staged_file = request.session.get(STAGED_METADATA_FILE_SESSION_KEY, {})

    # Build a minimal context for rendering the index/start form. We want to
    # persist the non-CAPTCHA inputs so the user does not need to re-enter
    # them after a failed CAPTCHA attempt.
    return {
        # The CAPTCHA form instance (either empty or bound with POST data).
        "captcha_form": captcha_form,

        # Repository URL entered by the user (if input_source is 'url').
        "repo_url": request.POST.get("repo_url", ""),

        # Personal access token (optional) used for authenticated API calls.
        "personal_token_key": request.POST.get("personal_token_key", ""),

        # Any metadata text pasted directly into the form.
        "pasted_metadata": request.POST.get("pasted_metadata", ""),

        # Which input source the user selected: 'url', 'file', or 'paste'.
        "input_source": request.POST.get("input_source", "url"),

        # Name of a staged/uploaded file preserved in the session (if any).
        "staged_file_name": staged_file.get("name", ""),
    }


class IndexView(TemplateView):
    """
    Simple TemplateView for the start/index page.

    This view renders the index template and injects an instance of the
    CaptchaForm into the template context so the form is available when the
    page is rendered via class-based view handling.
    """
    template_name = 'meta_creator/index.html'

    def get_context_data(self, **kwargs):
        """
        Return context for the index template.

        We call the superclass implementation to get the base context, then
        add a fresh CaptchaForm instance under the key 'captcha_form' so the
        template can render the CAPTCHA field.
        """
        context = super().get_context_data(**kwargs)
        # Provide an empty (unbound) CAPTCHA form for initial page load.
        context['captcha_form'] = CaptchaForm()  
        return context


def homepage(request):
    """
    Render the simple homepage.
    This view is used for the root URL and renders the index.html template.
    """
    return render(request, 'index.html')


def information(request):
    """
    Render the information page.
    This view is used for the '/About SMECS' URL and renders the information.html template.
    """
    return render(request, 'meta_creator/information.html')


def legals(request):
    """
    Render the legals page.
    This view is used for the '/Legals/Impressum' URL and renders the legals.html template.
    """
    return render(request, 'meta_creator/legals.html')


def index(request):
    """
    Validate the CAPTCHA and extract metadata from the selected source.
    """
    # Bind the submitted CAPTCHA data to the form so we can validate the user
    # input on every POST request before processing the metadata submission.
    captcha_form = CaptchaForm(request.POST or None)

    # Render the initial page on a GET request
    if request.method == "GET":
        return render(request, 'meta_creator/index.html', {
            "captcha_form": captcha_form,
        })

    # Handle form submissions by validating the selected input and CAPTCHA
    # before continuing with the extraction flow.
    if request.method == "POST":
        # Validate the selected source before CAPTCHA validation. The custom
        # file picker is visually hidden, so this server-side fallback keeps
        # the missing-file feedback clear even when JavaScript is unavailable.
        if (
            request.POST.get("input_source") == "file"
            and not request.FILES.get("metadata_file")
            and not request.session.get(STAGED_METADATA_FILE_SESSION_KEY)
        ):
            context = _index_context(request, CaptchaForm())
            context["error_message_file"] = (
                "Please select a metadata file before importing."
            )
            return render(request, "meta_creator/index.html", context)

        # Validate pasted metadata before the CAPTCHA check, matching the missing-file flow above.
        if request.POST.get("input_source") == "paste":
            paste_result = load_pasted_metadata(
                request.POST.get("pasted_metadata", "")
            )
            if not paste_result.get("success"):
                errors = paste_result.get("errors") or ["Invalid metadata JSON."]
                context = _index_context(request, CaptchaForm())
                context["error_message_paste"] = "; ".join(
                    str(error) for error in errors if error is not None
                )
                return render(request, "meta_creator/index.html", context)
        
        # If CAPTCHA validation fails, preserve file uploads for retry while
        # clearing any staged state for non-file submissions and showing a
        # user-facing error message.
        if not captcha_form.is_valid():
            if request.POST.get("input_source") == "file":
                # Keep the uploaded file in the session so the user can retry the
                # CAPTCHA without re-selecting the file.
                _stage_uploaded_file(request)
            else:
                # Clear any previous staged file when the user is not uploading a
                # file, since there is no file to restore for a retry.
                request.session.pop(STAGED_METADATA_FILE_SESSION_KEY, None)

            messages.error(request, "Invalid Captcha. Please try again.")
            return render(
                request,
                "meta_creator/index.html",
                _index_context(request, CaptchaForm()),
            )

        # CAPTCHA passed; restore a staged upload if one exists and continue
        # with metadata extraction from the chosen input source.
        try:
            staged_uploaded_file = _get_staged_uploaded_file(request)
            result = data_extraction(request, staged_uploaded_file)
            request.session.pop(STAGED_METADATA_FILE_SESSION_KEY, None)

            if not result.get('success'):
                errors = result.get('errors')
                error_messages = ["Error in extraction:"]
                if isinstance(errors, (list, tuple)):
                    normalized_errors = [str(error) for error in errors if error is not None]
                elif errors is not None:
                    normalized_errors = [str(errors)]
                else:
                    normalized_errors = ["Unknown error"]
                error_messages.extend(normalized_errors)
                return render(request, 'meta_creator/error.html', {
                    'error_message': "; ".join(error_messages)
                })

            extracted_metadata, description_metadata, type_metadata, joined_metadata = result['metadata']

            # Validate the joined metadata against the JSON-LD Codemeta schema and
            # set a user-friendly validation message based on the result.
            validation_result = (
                "The JSON data is a valid JSON-LD Codemeta object"
                if validate_codemeta(joined_metadata)
                else "The JSON data is not a valid JSON-LD Codemeta object"
            )

            # Serialize the joined metadata to a formatted JSON string with 4-space
            # indentation for improved readability in the template output.
            my_json_str = json.dumps(joined_metadata, indent=4)


            template = loader.get_template('meta_creator/showdata.html')

            # Render the template with all extracted metadata components and return
            # the HTTP response to the user.
            return HttpResponse(template.render({
                "type_metadata": type_metadata,
                "description_metadata": description_metadata,
                "extracted_metadata": extracted_metadata,
                "my_json_str": my_json_str,
                "from_showdata": True,
                "validation_result": validation_result,
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
            return HttpResponseForbidden("CSRF Error: This action is not allowed.")
        except Exception as unexpected_exception:
            return HttpResponseServerError(
                f"An unexpected error occurred: {unexpected_exception}"
            )

        return render(request, 'meta_creator/error.html', {'error_message': error_message})
    