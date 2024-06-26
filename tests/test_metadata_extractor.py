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

    def test_valid_gitlab_input(self):
        """
        This function tests the validity of input parameters for extracting metadata from GitLab repositories (using GitLab environmental variables).
        """

        # Check if PERSONAL_TOKEN_KEY is provided
        if not personal_token_gl:
            self.fail("PERSONAL_TOKEN_KEY not provided as environment variable.")

        request = MagicMock(method='POST', POST={'gl_url': GitLab_url, 'personal_token_key': personal_token_gl})
        result = data_extraction(request)
        self.assertIsInstance(result, tuple)
        self.assertEqual(len(result), 2)
        metadata, context = result
        self.assertIsInstance(metadata, dict)
        self.assertIsInstance(context, dict)
        self.assertIn('gl_url', context)
        self.assertEqual(context['gl_url'], GitLab_url)


    def test_valid_github_input(self):
        """
        This function tests the validity of input parameters for extracting metadata from GitHub repositories (using GitLab environmental variables).
        """
        request = MagicMock(method='POST', POST={'gl_url': GitHub_url, 'personal_token_key': personal_token_gh})
        result = data_extraction(request)
        self.assertIsInstance(result, tuple)
        self.assertEqual(len(result), 2)
        metadata, context = result
        self.assertIsInstance(metadata, dict)
        self.assertIsInstance(context, dict)   
        self.assertIn('gl_url', context)
        self.assertEqual(context['gl_url'], GitHub_url)

    def test_invalid_gitlab_input_URL(self):
        request = MagicMock(method='POST', POST={
            'gl_url': 'https://gitlab.com/zdin-zle/zle-platform/repository/meta_',
            'personal_token_key': personal_token_gl
        })
        result = data_extraction(request)
        self.assertEqual(result, 'Invalid URL')


    def test_invalid_gitlab_input_token(self):
        request = MagicMock(method='POST', POST={
            'gl_url': GitLab_url,
            'personal_token_key': 'glpat'
        })
        result = data_extraction(request)
        self.assertEqual(result, 'Invalid Personal Token Key')


if __name__ == '__main__':
    unittest.main()
