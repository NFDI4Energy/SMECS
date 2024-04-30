
import os
import unittest
from meta_creator.gitlab_metadata import addContribution, filLanguages, addLang, convertToJson, validate_codemeta, get_gitlab_metadata, extract_license_info, count_non_empty_values


GitLab_url = os.getenv('GL_URL')
personal_token_gl = os.getenv('CI_PERSONAL_TOKEN_KEY_GL')


class test_gitlab_metadata_extractor(unittest.TestCase):

    def test_addContribution(self):
        contributor = {'@type': 'Person', 'givenName': 'John',
                       'familyName': 'Doe', 'email': 'john@example.com'}
        metadata_dict = {'contributor': []}
        result = addContribution(contributor, metadata_dict)
        expected_result = {'contributor': [contributor]}
        self.assertEqual(result, expected_result,
                         f"Unexpected result: {result}")

    def test_filLanguages(self):
        languageName = ['Python', 'JavaScript']
        metadata_dict = {}
        result = filLanguages(languageName, metadata_dict)
        expected_result = {'programmingLanguage': ['Python', 'JavaScript']}
        self.assertEqual(result, expected_result,
                         f"Unexpected result: {result}")

    def test_addLang(self):
        lang = 'Java'
        metadata_dict = {'programmingLanguage': []}
        result = addLang(lang, metadata_dict)
        expected_result = {'programmingLanguage': ['Java']}
        self.assertEqual(result, expected_result,
                         f"Unexpected result: {result}")

    def test_convertToJson(self):
        metadata_dict = {'key': 'value'}
        projectname = "test_project"
        fromTextBox = False
        result = convertToJson(metadata_dict, projectname, fromTextBox)
        self.assertIsNotNone(
            result, "Failed to convert metadata to JSON format")

    def test_validate_codemeta(self):
        json_data = {'@context': 'https://doi.org/10.5063/schema/codemeta-2.0',
                     '@type': 'SoftwareSourceCode', 'name': 'TestProject'}
        result = validate_codemeta(json_data)
        self.assertTrue(result, "Failed to validate Codemeta JSON")

    def test_get_gitlab_metadata(self):
        result = get_gitlab_metadata(GitLab_url, personal_token_gl)
        self.assertIsNotNone(result, "Failed to retrieve GitLab metadata")

    def test_extract_license_info(self):
        result = extract_license_info(GitLab_url, personal_token_gl)
        self.assertIsNotNone(result, "Failed to extract license information")


if __name__ == '__main__':
    unittest.main()
