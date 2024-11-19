"""
This module provides functions for extracting metadata from GitLab requests.
"""

from django.views.decorators.csrf import csrf_exempt
from .url_check_GitLab import validate_gitlab_inputs
from .url_check_GitHub import validate_github_inputs
from .gitlab_metadata import get_gitlab_metadata
from .github_metadata import get_github_metadata
from .read_tokens import read_token_from_file
from .hermes_process import run_hermes_commands
import json

#################### getting metadata from gitlab project ####################

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
                    'description_dict': {
                        'codeRepository': 'Link to the repository where the un-compiled, human readable code and related code is located (SVN, GitHub, CodePlex, institutional GitLab instance, etc.).',
                        'id': 'Unique identifier',
                        'programmingLanguage': 'The computer programming language.',
                        'runtimePlatform': 'Runtime platform or script interpreter dependencies (Example - Java v1, Python2.3, .Net Framework 3.0). Supersedes runtime.',
                        'targetProduct': 'Target Operating System / Product to which the code applies. If applies to several versions, just the product name can be used.',
                        'applicationCategory': 'Type of software application, e.g. ‘Game, Multimedia’.',
                        'applicationSubCategory': 'Subcategory of the application, e.g. ‘Arcade Game’.',
                        'downloadUrl': 'If the file can be downloaded, URL to download the binary.',
                        'fileSize': 'Size of the application / package (e.g. 18MB). In the absence of a unit (MB, KB etc.), KB will be assumed.',
                        'installUrl': 'URL at which the app may be installed, if different from the URL of the item.',
                        'memoryRequirements': 'Minimum memory requirements.',
                        'operatingSystem': 'Operating systems supported (Windows 7, OSX 10.6, Android 1.6).',
                        'permissions': 'Permission(s) required to run the app (for example, a mobile app may require full internet access or may run only on wifi).',
                        'processorRequirements': 'Processor architecture required to run the application (e.g. IA64).',
                        'releaseNotes': 'Description of what changed in this version.',
                        'softwareHelp': 'Software application help.',
                        'softwareRequirements': 'Required software dependencies',
                        'softwareVersion': 'Version of the software instance.',
                        'storageRequirements': 'Storage requirements (free space required).',
                        'supportingData': 'Supporting data for a SoftwareApplication.',
                        'author': 'The author of this content or rating. Please note that author is special in that HTML 5 provides a special mechanism for indicating authorship via the rel tag. That is equivalent to this and may be used interchangeably.',
                        'citation': 'A citation or reference to another creative work, such as another publication, web page, scholarly article, etc.',
                        'contributor': 'A secondary contributor to the CreativeWork or Event.',
                        'copyrightHolder': 'The party holding the legal copyright to the CreativeWork.',
                        'copyrightYear': 'The year during which the claimed copyright for the CreativeWork was first asserted.',
                        'creator': 'The creator/author of this CreativeWork. This is the same as the Author property for CreativeWork.',
                        'dateCreated': 'The date on which the CreativeWork was created or the item was added to a DataFeed.',
                        'dateModified': 'The date on which the CreativeWork was most recently modified or when the item’s entry was modified within a DataFeed.',
                        'datePublished': 'Date of first broadcast/publication.',
                        'editor': 'Specifies the Person who edited the CreativeWork.',
                        'encoding': 'A media object that encodes this CreativeWork. This property is a synonym for associatedMedia. Supersedes encodings.',
                        'fileFormat': 'Media type, typically MIME format (see IANA site) of the content e.g. application/zip of a SoftwareApplication binary. In cases where a CreativeWork has several media type representations, ‘encoding’ can be used to indicate each MediaObject alongside particular fileFormat information. Unregistered or niche file formats can be indicated instead via the most appropriate URL, e.g. defining Web page or a Wikipedia entry.',
                        'funder': 'A person or organization that supports (sponsors) something through some kind of financial contribution.',
                        'keywords': 'Keywords or tags used to describe this content. Multiple entries in a keywords list are typically delimited by commas.',
                        'license': 'A license document that applies to this content, typically indicated by URL.',
                        'producer': 'The person or organization who produced the work (e.g. music album, movie, tv/radio series etc.).',
                        'provider': 'The service provider, service operator, or service performer; the goods producer. Another party (a seller) may offer those services or goods on behalf of the provider. A provider may also serve as the seller. Supersedes carrier.',
                        'publisher': 'The publisher of the creative work.',
                        'sponsor': 'A person or organization that supports a thing through a pledge, promise, or financial contribution. e.g. a sponsor of a Medical Study or a corporate sponsor of an event.',
                        'version': 'The version of the CreativeWork embodied by a specified resource.',
                        'isAccessibleForFree': 'A flag to signal that the publication is accessible for free.',
                        'isPartOf': 'Indicates a CreativeWork that this CreativeWork is (in some sense) part of. Reverse property hasPart',
                        'hasPart': 'Indicates a CreativeWork that is (in some sense) a part of this CreativeWork. Reverse property isPartOf',
                        'position': 'The position of an item in a series or sequence of items. (While schema.org considers this a property of CreativeWork, it is also the way to indicate ordering in any list (e.g. the Authors list). By default arrays are unordered in JSON-LD',
                        'description': 'A description of the item.',
                        'identifier': 'The identifier property represents any kind of identifier for any kind of Thing, such as ISBNs, GTIN codes, UUIDs etc. Schema.org provides dedicated properties for representing many of these, either as textual strings or as URL (URI) links. See background notes for more details.',
                        'name': 'The name of the item (software, Organization)',
                        'sameAs': 'URL of a reference Web page that unambiguously indicates the item’s identity. E.g. the URL of the item’s Wikipedia page, Wikidata entry, or official website.',
                        'url': 'URL of the item.',
                        'relatedLink': 'A link related to this object, e.g. related web pages',
                        'givenName': 'Given name. In the U.S., the first name of a Person. This can be used along with familyName instead of the name property',
                        'familyName': 'Family name. In the U.S., the last name of an Person. This can be used along with givenName instead of the name property.',
                        'email': 'Email address',
                        'affiliation': 'An organization that this person is affiliated with. For example, a school/university',
                        'identifier': 'URL identifier, ideally an ORCID ID for individuals, a FundRef ID for funders',
                        'name': 'The name of an Organization, or if separate given and family names cannot be resolved for a Person',
                        'address': 'Physical address of the item.',
                        'softwareSuggestions': 'Optional dependencies , e.g. for optional features, code development, etc.',
                        'maintainer': 'Individual responsible for maintaining the software (usually includes an email contact address)',
                        'contIntegration': 'link to continuous integration service',
                        'buildInstructions': '	link to installation instructions/documentation',
                        'developmentStatus': 'Description of development status, e.g. Active, inactive, suspended. See repostatus.org',
                        'embargoDate': 'Software may be embargoed from public access until a specified date (e.g. pending publication, 1 year from publication)',
                        'funding': 'Funding source (e.g. specific grant)',
                        'issueTracker': 'link to software bug reporting or issue tracking system',
                        'referencePublication': 'An academic publication related to the software.',
                        'readme': 'link to software Readme file',
                    }
                }

        is_valid_github = validate_github_inputs(gl_url)

        tokens = read_token_from_file('tokens.txt')
        default_access_token_GL = tokens.get('gitlab_token')
        is_valid_gitlab, error_messages = validate_gitlab_inputs(gl_url, personal_token_key)

        if is_valid_gitlab:
            metadata = get_gitlab_metadata(gl_url, personal_token_key)
            hermes_metadata = run_hermes_commands(gl_url)
            if not metadata:
                metadata = get_gitlab_metadata(gl_url, default_access_token_GL)
            return (metadata, context, hermes_metadata)
        

        elif is_valid_github:
            metadata = get_github_metadata(gl_url, personal_token_key)
            hermes_metadata = run_hermes_commands(gl_url)
            if metadata:
                return (metadata, context, hermes_metadata)

        if 'Invalid URL' in error_messages:
            return 'Invalid URL'
        if 'Invalid GitLab API token' in error_messages:
            return 'Invalid Personal Token Key'
        if not is_valid_github:
            return 'Invalid GitHub URL'
