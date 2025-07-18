import sys
import os

import unittest
from unittest.mock import MagicMock
from meta_creator.metadata_extractor import data_extraction

GitLab_url = os.getenv('GL_URL')
GitHub_url = os.getenv('GH_URL')
personal_token_gl = os.getenv('CI_PERSONAL_TOKEN_KEY_GL')
personal_token_gh = os.getenv('CI_PERSONAL_TOKEN_KEY_GH')

class TestDataExtraction(unittest.TestCase):
    pass

    # TODO unittests for GitLab instances (HERMES-based extraction)
    # def test_valid_gitlab_input(self):
    #     """
    #     This function tests the validity of input parameters for extracting metadata from GitLab repositories (using GitLab environmental variables).
    #     """

    #     # Check if PERSONAL_TOKEN_KEY is provided
    #     if not personal_token_gl:
    #         self.fail("PERSONAL_TOKEN_KEY not provided as environment variable.")

    #     request = MagicMock(method='POST', POST={'gl_url': GitLab_url, 'personal_token_key': personal_token_gl})
    #     result = data_extraction(request)
    #     self.assertIsInstance(result, tuple)
    #     self.assertEqual(len(result), 3)
    #     metadata, context, hermes_metadata = result
    #     self.assertIsInstance(metadata, dict)
    #     self.assertIsInstance(context, dict)
    #     self.assertIsInstance(hermes_metadata, dict) 
    #     self.assertIn('gl_url', context)
    #     self.assertEqual(context['gl_url'], GitLab_url)


    # def test_valid_github_input(self):
    #     """
    #     This function tests the validity of input parameters for extracting metadata from GitHub repositories (using GitLab environmental variables).
    #     """
    #     request = MagicMock(method='POST', POST={'gl_url': GitHub_url})
    #     result = data_extraction(request)
    #     self.assertIsInstance(result, tuple)
    #     self.assertEqual(len(result), 3)
    #     metadata, context, hermes_metadata = result
    #     self.assertIsInstance(metadata, dict)
    #     self.assertIsInstance(context, dict)
    #     self.assertIsInstance(hermes_metadata, dict) 
    #     self.assertIn('gl_url', context)
    #     self.assertEqual(context['gl_url'], GitHub_url)
        
 
    # def test_valid_github_input(self):
    #     """
    #     Tests extracting metadata from GitHub repositories via HERMES.
    #     Expects a dict with keys: 'success', 'metadata'.
    #     """
    #     if not personal_token_gh:
    #         self.fail("PERSONAL_TOKEN_KEY for GitHub not provided.")

    #     request = MagicMock(method='POST', POST={
    #         'gl_url': GitHub_url,
    #         'personal_token_key': personal_token_gh 
    #     })
    #     result = data_extraction(request)
        
    #     self.assertIsInstance(result, dict)
    #     self.assertIn('success', result)
    #     self.assertIn('metadata', result)
        
    #     if result.get('metadata') is None:
    #         print("No Metadata present")
    #     else:
    #         extracted_metadata, description_metadata, type_metadata, joined_metadata = result.get('metadata')
    #         self.assertIsInstance(extracted_metadata, dict, "extracted_metadata should be a dict")
    #         self.assertIsInstance(description_metadata, dict, "description_metadata should be a dict")
    #         self.assertIsInstance(type_metadata, dict, "type_metadata should be a dict")
    #         self.assertIsInstance(joined_metadata, dict, "joined_metadata should be a dict")


    # def test_invalid_gitlab_input_URL(self):
    #     request = MagicMock(method='POST', POST={
    #         'gl_url': 'https://gitlab.com/zdin-zle/zle-platform/repository/meta_',
    #         'personal_token_key': personal_token_gl
    #     })
    #     result = data_extraction(request)
    #     self.assertEqual(result, 'Invalid URL')


    # def test_invalid_gitlab_input_token(self):
    #     request = MagicMock(method='POST', POST={
    #         'gl_url': GitLab_url,
    #         'personal_token_key': 'glpat'
    #     })
    #     result = data_extraction(request)
    #     self.assertEqual(result, 'Invalid Personal Token Key')


# if __name__ == '__main__':
#     unittest.main()
