import requests, re
import gitlab
from urllib.parse import urlparse
import json
from pyld import jsonld
import copy
from django.views.decorators.csrf import csrf_exempt
from .common_functions import findWord


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

    gitlab_base_url = 'https://{}/api/v4'.format(domain)
    project_id = project.id

    # Get the raw text URL of the LICENSE.txt file
    response = requests.get(
        f"{gitlab_base_url}/projects/{project_id}/repository/files/LICENSE.txt/raw?ref=master", 
            timeout=10)

    if response.status_code == 200:
        license_text = response.text.strip()
        license_name = license_text.splitlines()[0]
        return license_name
    if response.status_code == 404:
        response = requests.get(
            f"{gitlab_base_url}/projects/{project_id}/repository/files/LICENSE/raw?ref=master", 
                timeout=10)
        if response.status_code == 200:
            license_name = None
            license_text = response.text.strip()
            license_name = license_text.splitlines()[0]
            return license_name
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


# Validating json.ld
def validate_codemeta(json):
    """Check whether a codemeta json object is valid"""
    try:
        original_context = json["@context"]
        context = json["@context"]
    except:
        print("Not a JSON-LD file")
        return False
    
    if context == "https://doi.org/10.5063/schema/codemeta-2.0":
        # Temp replacement for https resolution issues for schema.org
        context = "https://raw.githubusercontent.com/caltechlibrary/convert_codemeta/main/codemeta.jsonld"
        json["@context"] = context
    cp = copy.deepcopy(json)
    # Expand and contract to check mapping
    cp = jsonld.expand(cp)
    cp = jsonld.compact(cp, context)
    keys = cp.keys()
    # Using len because @type elements get returned as type
    same = len(set(keys)) == len(set(json.keys()))
    if not same:
        print("Unsupported terms in Codemeta file")
        diff = set(json.keys()) - set(keys)
        if "@type" in diff:
            diff.remove("@type")
        print(sorted(diff))
    fail = ":" in keys
    if fail:
        print("Not in schema")
        for k in keys:
            if ":" in k:
                print(k)

    # Restore the original context
    json["@context"] = original_context
    return same and not fail


# Extract data from GitLab
def get_gitlab_metadata(gl_url, personal_token_key):
        parsed_url = urlparse(gl_url)
        domain = parsed_url.netloc
        host = parsed_url.scheme + '://' + parsed_url.netloc + '/'
        # Initialize the GitLab API client
        git_client = gitlab.Gitlab(host, private_token=personal_token_key)

        # Standardizing the format of URL to make an API call
        gl_url_standard = gl_url.replace(host, "")

        # Get a project by URL
        project = git_client.projects.get(gl_url_standard)

        # Extract license information
        license_name = extract_license_info(gl_url, personal_token_key)

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
            "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
            # "test": "test",
            "@type": "SoftwareSourceCode",
            "name": repositoryName,
            "identifier": identifier,
            "description": description,
            "codeRepository": codeRepository,
            "url": codeRepository,
            # "id": codeRepository,
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
            "contributor": [],
        }

        # Adds metadata in groups to the dict object.
        metadata_dict = filLanguages(languageName, metadata_dict)
        metadata_dict = findContributors(contributorsString, metadata_dict)

        # Converting the data to JSON. (creating a json file based on the codemeta)
        gitlab_metadata = convertToJson(metadata_dict, repositoryName, False)

        return metadata_dict
