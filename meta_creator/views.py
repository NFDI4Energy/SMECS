from django.views.generic import TemplateView
from django import forms
from django.template import loader
from django.http import HttpResponse
import json
from .metadata_extractor import data_extraction
from meta_creator.settings import META_VERSIONS
from meta_creator.forms import CreatorForm


class IndexView(TemplateView):
    template_name = 'meta_creator/index.html'
    extra_context = {"versions": META_VERSIONS.keys()}


class CreatorView(TemplateView):
    template_name = 'meta_creator/creator.html'
    metapath = None

    def get_context_data(self, **kwargs):
        return {'creator': CreatorForm(self.metapath.name)}


# Function for metadata extracting
my_json_str = {}
def index(request):
  if request.method == 'POST':
   global my_json_str
   # Extract metadata
   ExtractedMetadata, EnteredData = data_extraction(request)
   # Convert the dictionary to JSON
   my_json_str = json.dumps(ExtractedMetadata, indent=4)
   template = loader.get_template('meta_creator/showdata.html')
   return HttpResponse(template.render({
       "EnteredData":EnteredData,
       "ExtractedMetadata":ExtractedMetadata,
       "my_json_str": my_json_str,
    }, request))
  else:
   #if post request is not true - returing the form template
   template = loader.get_template('meta_creator/index.html')
   return HttpResponse(template.render())

# View function for downloading metadata as JSON
# def download_json(request):
#     global my_json_str
#     # Create a response object with the JSON data and the appropriate content type
#     response = HttpResponse(my_json_str, content_type='application/json')
#     # Set the Content-Disposition header to specify the filename
#     response['Content-Disposition'] = 'attachment; filename="metadata.json"'
#     return response
