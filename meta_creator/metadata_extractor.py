"""
This module provides functions for extracting metadata from GitLab requests.
"""

import json
from urllib.parse import urlparse
import gitlab
from django.views.decorators.csrf import csrf_exempt
import requests
from .url_check import validate_gitlab_inputs

# functions for data filtering #

# --------------- findWordInGroup function ---------------
# Function to find a word in a group of several words, in a String.
# groupName = name of the group from the searched word.
# wordName = name of the metadata fieldname of the searched word.
# distanceAfterWord = number of characters from the beginning of wordName to the searched Name.
# splitName = True if the wordName is a word with whitespaces.
# False if wordName has no whitespaces.
# searchString = String in which groupName and wordName are.
# return wordNameReturn = returns the searched word.


def findWordInGroup(groupName, wordName, distanceAfterWord, splitName, searchString):
    lineNumber = searchString.find(groupName)
    wordNameReturn = ""
    if lineNumber != -1:
        wordNameNumber = searchString[
            lineNumber:lineNumber + 500].find(wordName) + distanceAfterWord + lineNumber
        wordName = searchString[
            wordNameNumber:searchString[
                wordNameNumber:wordNameNumber + 100].find("'") + wordNameNumber]
        if splitName:
            wordNameReturn = wordNameReturn + wordName[0:wordName.find(" ")]
            wordGivenNamesCount = wordName.count(" ")
            i = 1
            lastName = wordName.find(" ")
            while i < wordGivenNamesCount:
                wordNameReturn = wordNameReturn + \
                    wordName[lastName + 1:wordName.find(" ")]
                lastName = wordName[lastName + 1:100].find(" ")
                i += 1
        else:
            wordNameReturn = wordName
    else:
        wordNameReturn = ""
    return wordNameReturn

# --------------- findWord function ---------------
# Function to find a word in a String.
# wordName = name of the metadata fieldname of the searched word.
# distanceAfterWord = number of characters from the beginning of wordName to the searched Name.
# searchString = String in which the wordName is.
# return wordNameReturn = returns the searched word.


def findWord(wordName, distanceAfterWord, searchString):
    lineNumber = searchString.find(wordName) + distanceAfterWord
    wordNameReturn = searchString[
        lineNumber:searchString[lineNumber:lineNumber + 200].find("'") + lineNumber]
    if wordNameReturn == "one, ":
        wordNameReturn = ""
        wordNameReturn = wordNameReturn.replace("\"", "")
    return wordNameReturn

# --------------- findTopics function---------------
# Function to filter topics from a String.
# searchString = String in which the word 'topics' is.
# return topicsReturn = returns the searched topics.


def findTopics(searchString):
    lineNumber = searchString.find("'topics'") + 11
    topics = searchString[lineNumber:searchString
                          [lineNumber:lineNumber + 100].find("]") + lineNumber]
    if topics == "":
        topicsReturn = ""
    else:
        # replace the ' from gitLab with a " for the CodeMeta format.
        topicsNew = topics.replace("'", '"')
        topicsCount = topicsNew.count('"') - 2
        # replace \ , because they were added in the line before.
        topicsReturn = topicsNew[1:100].replace('\\', "", topicsCount)
        # turning the String around and delete the \ at the beginning.
        topicsReturn = topicsReturn[::-1]
        topicsReturn = topicsReturn[1:100].replace('\\', "", topicsCount)
        topicsReturn = topicsReturn[::-1]
    return topicsReturn

# Function to find a word in a String with a splitName.
# wordName = name of the metadata fieldname of the searched word.
# distanceAfterWord = number of characters from the beginning of wordName to the searched Name.
# searchString = String in which the wordName is.
# splitName = True if the wordName is a word with whitespaces.
# False if wordName has no whitespaces.
# return wordNameReturn = returns the searched word.


def findWordWithSplitName(wordName, distanceAfterWord, searchString, splitName):
    lineNumber = searchString.find(wordName) + distanceAfterWord
    wordName = searchString[lineNumber:searchString
                            [lineNumber:lineNumber + 200].find("'") + lineNumber]
    wordName = wordName.replace("\"", "")
    wordGivenNamesCount = wordName.count(" ")
    wordNameReturn = [""] * 2
    if splitName and wordGivenNamesCount > 0:
        wordNameReturn[0] = wordName[0:wordName.find(" ")]
        i = 1
        lastName = wordName.find(" ")
        lastFamilyName = lastName
        while i < wordGivenNamesCount:
            wordNameReturn[0] = wordNameReturn[0] + " " + wordName[
                lastName + 1:wordName
                [lastName + 1:lastName + 100].find(
                    " ") + lastName + 1]
            lastFamilyName = wordName[lastName +
                                      1:100].find(" ") + lastName + 1
            lastName = wordName[lastName + 1:100].find(" ")
            i += 1
        if i == wordGivenNamesCount:
            wordNameReturn[1] = wordName[lastFamilyName +
                                         1:lastFamilyName + 100]
    else:
        wordNameReturn[0] = wordName
        wordNameReturn[1] = ""
        return wordNameReturn
    return wordNameReturn

# --------------- working on Contributors
# (finding and filling contributors in the python object (metadata_dict))
# Function to filter contributors from the data.
# searchString = String in which the contributors are.
# metadata_dict = A dict object in which the filtered metadata is stored.
# return metadata_dict = returns the dict with the contributors.


def findContributors(searchString, metadata_dict):
    countContributors = searchString.count("}")
    contributorsStringTemp = searchString
    i = 1
    lastChar = 1
    while i <= countContributors:
        contributorsStringTemp = searchString[
            lastChar:searchString[lastChar:lastChar + 300].find("}") + lastChar]
        contributorName = findWordWithSplitName(
            "'name'", 9, contributorsStringTemp, True)
        contributorEmail = findWordWithSplitName("'email'",
                                                 10, contributorsStringTemp, False)[0]
        contributor = {}
        contributor["@type"] = "Person"
        contributor["givenName"] = contributorName[0]
        contributor["familyName"] = contributorName[1]
        contributor["email"] = contributorEmail
        lastChar = len(contributorsStringTemp) + lastChar + 1
        metadata_dict = addContribution(contributor, metadata_dict)
        i = i + 1
    return metadata_dict

# Function to add new contributors to a dict object.
# contributor = dict object with the attributes of a contributor.
# metadata_dict = dict object with the contributors.
# return metadata_dict = returns the dict with the contributors.


def addContribution(contributor, metadata_dict):
    metadata_dict["contributor"].append(contributor)
    return metadata_dict

# working on languages
# (finding and filling languages in the python object (metadata_dict))
# Function to filter language names from the data.
# langaugeName = Array with the languages.
# metadata_dict = dict object with the filtered data.
# return metadata_dict = returns the dict with the languages.
# The function creates a new list called lang_list
# and appends each programming language in languageName to it.


def filLanguages(languageName, metadata_dict):
    lang_list = []
    for lang in languageName:
        lang_list.append(lang)
    metadata_dict["programmingLanguage"] = lang_list
    return metadata_dict

# Function to add new languages to a dict object.
# lang = dict object with the attributes of a langauge.
# metadata_dict = dict object with the languages.
# return metadata_dict = returns the dict with the languages.


def addLang(lang, metadata_dict):
    metadata_dict["programmingLanguage"].append(lang)
    return metadata_dict

# --------------- convert the MetaDict object into JSON ---------------
# Function to convert da dict object to the JSON format and to save the metadata to a file.
# metadata_dict = dict object with the filtered data.
# projectname = name of the file, which will be created.
# fromTextBox = True if the data comes from the GUI. False if the data is not from the GUI.
# return gitlab_metadata = returns the metadata in JSON format.


def convertToJson(metadata_dict, projectname, fromTextBox):
    # convert into JSON:
    if (fromTextBox == False):
        # indent = 4 to order the data among themselves.
        gitlab_metadata = json.dumps(metadata_dict, indent=4)
    else:
        gitlab_metadata = metadata_dict
    # replaces \ for the Backslashes in the findTopics function.
    # \ are not allowed in JSON, because of that all of the \ are deleted.
    gitlab_metadata = gitlab_metadata.replace("\\", "")
    fileName = "Metadata " + projectname + ".json"
    # utf_16 encoding, because some names are otherwise not rightfully encoded.
    file = open(fileName, 'wt', encoding="utf_16")
    file.write(gitlab_metadata)
    file.close()
    return gitlab_metadata

# --------------- working on License ---------------

def extract_license_info(project_url, personal_token_key):
    """
    Extracts license information for a given project.

    Args:
        project_url: The URL of the project.
        personal_token_key: The personal token key for authentication.

    Returns:
        License name of the GitLab project if exists, returns none otherwise.
    """
    parsed_url = urlparse(project_url)
    domain = parsed_url.netloc
    host = parsed_url.scheme + '://' + parsed_url.netloc + '/'
    # Initialize the GitLab API client
    git_client = gitlab.Gitlab(host, private_token=personal_token_key)

    # Standardizing the format of URL to make an API call
    gl_url_standard = project_url.replace(host, "")

    # Get a project by URL
    project = git_client.projects.get(gl_url_standard)

    # gitlab_base_url = "https://gitlab.com/api/v4"
    gitlab_base_url = 'https://{}/api/v4'.format(domain)
    project_id = project.id

    # Get the raw text URL of the LICENSE.txt file
    response = requests.get(
        f"{gitlab_base_url}/projects/{project_id}/repository/files/LICENSE.txt/raw?ref=master", 
            timeout=10)

    if response.status_code == 200:
        # Print the raw text of the file
        license_text = response.text.strip()
        license_name = license_text.splitlines()[0]
        # print(f"License name: {license_name}")
        return license_name
    if response.status_code == 404:
        response = requests.get(
            f"{gitlab_base_url}/projects/{project_id}/repository/files/LICENSE/raw?ref=master", 
                timeout=10)
        if response.status_code == 200:
            license_name = None
            license_text = response.text.strip()
            license_name = license_text.splitlines()[0]
            # print(f"License name: {license_name}")
            return license_name
            # print(f"Failed to retrieve file. Status code: {response.status_code}")
        return ""

# Counting number of extracted metadata
def count_non_empty_values(data):
    count = 0
    if isinstance(data, dict):
        for value in data.values():
            if value != "" and value is not None and value != ['']:
                count += 1
    elif isinstance(data, list):
        for item in data:
            if item != "" and item is not None and item != ['']:
                count += 1
    return count

#################### getting metadata from gitlab project ####################

@csrf_exempt
def data_extraction(request):
    if request.method == 'POST':
        # getting values from post
        project_name = request.POST.get('project_name')
        gl_url = request.POST.get('gl_url')
        personal_token_key = request.POST.get('personal_token_key')
        # if not is_valid_gitlab_url(gl_url):
        #     return 'Invalid URL'
        is_valid, error_messages = validate_gitlab_inputs(gl_url, personal_token_key)
        if not is_valid:
            if 'Invalid GitLab URL' in error_messages:
                return 'Invalid GitLab URL'
            if 'Invalid GitLab API token' in error_messages:
                return 'Invalid Personal Token Key'
        else:
            parsed_url = urlparse(gl_url)
            domain = parsed_url.netloc
            host = parsed_url.scheme + '://' + parsed_url.netloc + '/'
            # Initialize the GitLab API client
            # git_client = gitlab.Gitlab("https://gitlab.com", private_token=personal_token_key)
            git_client = gitlab.Gitlab(host, private_token=personal_token_key)

            # Standardizing the format of URL to make an API call
            # gl_url_standard = gl_url.replace("https://gitlab.com/", "")
            gl_url_standard = gl_url.replace(host, "")

            # Get a project by URL
            project = git_client.projects.get(gl_url_standard)

            # Extract license information
            license_name = extract_license_info(gl_url, personal_token_key)

            # adding the values in a context variable
            context = {
                'gl_url': gl_url,
                'project_name': project_name,
                'personal_token_key': personal_token_key,
                'description_dict': {
                    'codeRepository': 'Link to the repository where the un-compiled, human readable code and related code is located (SVN, GitHub, CodePlex, institutional GitLab instance, etc.).',
                    'id': 'Unique identifier',
                    'programmingLanguage': 'The computer programming language.',
                    'runtimePlatform': 'Runtime platform or script interpreter dependencies (Example - Java v1, Python2.3, .Net Framework 3.0). Supersedes runtime.',
                    'targetProduct': 'Target Operating System / Product to which the code applies. If applies to several versions, just the product name can be used.',
                    'applicationCategory': 'Type of software application, e.g. ‘Game, Multimedia’.',
                    'applicationSubCategory': 'Subcategory of the application, e.g. ‘Arcade Game’.',
                    'downloadUrl': 'If the file can be downloaded, URL to download the binary.',
                    'fileSize': 'Size of the application / package (e.g. 18MB). In the absence of a unit (MB, KB etc.), KB will be assumed.',
                    'installUrl': 'URL at which the app may be installed, if different from the URL of the item.',
                    'memoryRequirements': 'Minimum memory requirements.',
                    'operatingSystem': 'Operating systems supported (Windows 7, OSX 10.6, Android 1.6).',
                    'permissions': 'Permission(s) required to run the app (for example, a mobile app may require full internet access or may run only on wifi).',
                    'processorRequirements': 'Processor architecture required to run the application (e.g. IA64).',
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
                    'fileFormat': 'Media type, typically MIME format (see IANA site) of the content e.g. application/zip of a SoftwareApplication binary. In cases where a CreativeWork has several media type representations, ‘encoding’ can be used to indicate each MediaObject alongside particular fileFormat information. Unregistered or niche file formats can be indicated instead via the most appropriate URL, e.g. defining Web page or a Wikipedia entry.',
                    'funder': 'A person or organization that supports (sponsors) something through some kind of financial contribution.',
                    'keywords': 'Keywords or tags used to describe this content. Multiple entries in a keywords list are typically delimited by commas.',
                    'license': 'A license document that applies to this content, typically indicated by URL.',
                    'producer': 'The person or organization who produced the work (e.g. music album, movie, tv/radio series etc.).',
                    'provider': 'The service provider, service operator, or service performer; the goods producer. Another party (a seller) may offer those services or goods on behalf of the provider. A provider may also serve as the seller. Supersedes carrier.',
                    'publisher': 'The publisher of the creative work.',
                    'sponsor': 'A person or organization that supports a thing through a pledge, promise, or financial contribution. e.g. a sponsor of a Medical Study or a corporate sponsor of an event.',
                    'version': 'The version of the CreativeWork embodied by a specified resource.',
                    'isAccessibleForFree': 'A flag to signal that the publication is accessible for free.',
                    'isPartOf': 'Indicates a CreativeWork that this CreativeWork is (in some sense) part of. Reverse property hasPart',
                    'hasPart': 'Indicates a CreativeWork that is (in some sense) a part of this CreativeWork. Reverse property isPartOf',
                    'position': 'The position of an item in a series or sequence of items. (While schema.org considers this a property of CreativeWork, it is also the way to indicate ordering in any list (e.g. the Authors list). By default arrays are unordered in JSON-LD',
                    'description': 'A description of the item.',
                    'identifier': 'The identifier property represents any kind of identifier for any kind of Thing, such as ISBNs, GTIN codes, UUIDs etc. Schema.org provides dedicated properties for representing many of these, either as textual strings or as URL (URI) links. See background notes for more details.',
                    'name': 'The name of the item (software, Organization)',
                    'sameAs': 'URL of a reference Web page that unambiguously indicates the item’s identity. E.g. the URL of the item’s Wikipedia page, Wikidata entry, or official website.',
                    'url': 'URL of the item.',
                    'relatedLink': 'A link related to this object, e.g. related web pages',
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

        #################### attributes of the project ####################
        # getting project details
        # and storing in variables to convert them for the desired format
        # List of attributes in the project:
            attributes = project.attributes

        # List of forks of the project:
            forks = project.forks.list()

        # List of languages with percentage:
            languagesPercent = project.languages()

        # List of contributors of the project, with name, email, commits etc.:
            contributors = project.repository_contributors(get_all=True)

        # List of users which use the repository:
            users = project.users.list(get_all=True)

        # List of general items of the repository:
            generalItems = project.repository_tree(get_all=True)

            # finding words in project attributes for the conversion to the desired format #
            # Converts the data to String to find words in it.
            projectString = str(project)
            languagesPercentString = str(languagesPercent)
            contributorsString = str(contributors)

            # Finds the id of the repository.
            findId = projectString.find("id")
            identifier = projectString[
                findId + 5:findId + projectString[findId + 5:findId + 30].find(",") + 5]

            # ---------------description---------------
            # Finds the description of the repository.
            findDescription = projectString.find("description")
            descriptionCut = projectString[findDescription +
                                           15:findDescription + 1000]
            findDescriptionCut = descriptionCut.find("'")
            description = descriptionCut[0:findDescriptionCut]
            if description == "":
                description = ""

            # ---------------codeRepository---------------
            # Finds the URL of the repository.
            findRepositoryURL = projectString.find("http_url")
            codeRepository = projectString[
                findRepositoryURL + 20:findRepositoryURL + projectString[
                    findRepositoryURL + 20:findRepositoryURL + 250].find("'") + 20]
            # ---------------issueTrackerURL---------------
            # Finds the issueTracker URL of the repository.
            findIssueTracker = projectString.find("issues")
            issueTrackerURL = projectString[
                findIssueTracker + 10:findIssueTracker + projectString[
                    findIssueTracker + 10:findIssueTracker + 200].find("'") + 10]

            #################### working on languages ####################
            # Filters and converts the languages to an array.
            countLanguages = languagesPercentString.count(",") + 1
            nextLang = 2
            languageName = [""] * countLanguages
            for i, item in enumerate(languageName):
                languageName[i] = languagesPercentString[
                    nextLang:languagesPercentString[nextLang:100].find("'") + nextLang]
                lastChar = languagesPercentString[nextLang:100].find(
                    "'") + nextLang + 1
                nextLang = languagesPercentString[lastChar:100].find(
                    "'") + lastChar + 1

            #################### working on owner of the repository data ####################
            # Finds the givenName and familyName of the owner of the repository.
            ownerLineNumber = projectString.find("owner")
            ownerUsername = ""
            ownerName = ""
            ownerGivenNames = ""
            ownerFamilyNames = ""
            if ownerLineNumber != -1:
                ownerUsernameNumber = projectString[ownerLineNumber:ownerLineNumber + 200].find(
                    "username") + 12 + ownerLineNumber
                ownerNameNumber = projectString[ownerUsernameNumber:ownerUsernameNumber + 200].find(
                    "name") + 8 + ownerUsernameNumber
                ownerName = projectString[
                    ownerNameNumber:projectString[
                        ownerNameNumber:ownerNameNumber + 100].find("'") + ownerNameNumber]
                ownerGivenNamesCount = ownerName.count(" ")
                ownerGivenNames = ownerGivenNames + \
                    ownerName[0:ownerName.find(" ")]
                i = 1
                lastName = ownerName.find(" ")
                if i == ownerGivenNamesCount:
                    ownerFamilyNames = ownerName[ownerName.find(" ") + 1:100]
                while i < ownerGivenNamesCount:
                    ownerGivenNames = ownerGivenNames + \
                        ownerName[lastName + 1:ownerName.find(" ")]
                    lastName = ownerName[lastName + 1:100].find(" ")
                    i += 1
                    if i == ownerGivenNamesCount:
                        ownerFamilyNames = ownerName[lastName + 1:100]
            if ownerGivenNames == "":
                ownerGivenNames = ""
            if ownerFamilyNames == "":
                ownerFamilyNames = ""

            #################### data filtering with functions ####################
            # Uses the functions to filter the data -> findWordInGroup / findWord / findTopics (declared up)
            namespaceName = findWordInGroup(
                "'namespace'", "'name'", 9, False, projectString)
            dateModified = findWord("'last_activity_at'", 21, projectString)
            dateModified = dateModified[0:dateModified.find("T")]
            dateCreated = findWord("'created_at'", 15, projectString)
            dateCreated = dateCreated[0:dateCreated.find("T")]
            permissions = findWord("'visibility'", 15, projectString)
            readmeURL = findWord("'readme_url'", 15, projectString)
            repositoryName = findWord("'name'", 9, projectString)
            topics = findTopics(projectString)

            # ---------Generating of a JSON file---------
            # !If the number of metadata fields is changed, these numbers need to change with them!
            # programmingLanguageColumn has 8 metadata fields behind.
            # topicsColumn has 16 metadata fields behind.
            # contributorColumn has 20 metadata fields behind.
            programmingLanguageColumn = 8
            topicsColumn = 16
            contributorColumn = 20

            # A Python object (dict) with the filtered metadata:
            metadata_dict = {
                "@type": "SoftwareSourceCode",
                "name": repositoryName,
                "identifier": identifier,
                "description": description,
                "codeRepository": codeRepository,
                "url": codeRepository,
                "id": codeRepository,
                "issueTracker": issueTrackerURL,
                "license": license_name,
                # "version": version,
                "programmingLanguage": [],
                "author": [{"givenName": ownerGivenNames,
                            "familyName": ownerFamilyNames,
                            "@type": "Person"}],
                "copyrightHolder": {"@type": "Person", "name": namespaceName},
                "dateModified": dateModified,
                "dateCreated": dateCreated,
                # "publisher": namespaceName,
                "keywords": [topics],
                "downloadUrl": codeRepository,
                "permissions": permissions,
                "readme": readmeURL,
                "contributor": []
            }

            # Adds metadata in groups to the dict object.
            metadata_dict = filLanguages(languageName, metadata_dict)
            metadata_dict = findContributors(contributorsString, metadata_dict)

            # Converting the data to JSON. (creating a json file based on the codemeta)
            gitlab_metadata = convertToJson(
                metadata_dict, repositoryName, False)
            return (metadata_dict, context)
