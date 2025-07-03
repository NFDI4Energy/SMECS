"""
Module: test_github_metadata_extractor

This module contains unit tests for the GitHub metadata extraction functionality.
The tests are designed to validate the behavior of the 'get_github_metadata' function
in extracting metadata from GitHub repositories.
"""

import os
import unittest
from meta_creator.github_metadata import get_github_metadata, get_api_url
from unittest.mock import patch

GitHub_url = os.getenv('GH_URL')
personal_token_gh = os.getenv('CI_PERSONAL_TOKEN_KEY_GH')

class test_github_metadata_extractor(unittest.TestCase):
    """
    Unit tests for the GitHub metadata extraction functionality.

    This test class contains individual test cases to validate the behavior
    of the 'get_github_metadata' function in extracting metadata from GitHub repositories.
    """
    pass

# TODO unittests for GitHub instances (HERMES-based extraction)
#     def test_valid_github_url(self):
#         """
#         Test the retrieval of GitHub metadata for a valid repository URL.
#         """
#         # Mocking the file reading function used within get_github_metadata
#         with patch('__main__.open') as mock_open:
#             mock_open.return_value.__enter__.return_value.read.return_value = "tokens.txt"
            
#             metadata = get_github_metadata(GitHub_url, personal_token_gh)

#         self.assertIsNotNone(metadata)
#         self.assertEqual(metadata["@type"], "SoftwareSourceCode")


#     def test_api_connection_success(self):
#         """
#         Test handling of successful GitHub API connection
#         """
#         result = get_github_metadata(GitHub_url, personal_token_gh)
#         self.assertIsNotNone(result)


#     def test_github_io_url(self):
#         """Test the conversion of a GitHub repository URL which ends with '.github.io' to its API endpoint URL"""
#         owner = "KnowledgeCaptureAndDiscovery"
#         repo = "knowledgecaptureanddiscovery"
#         url = "https://github.com/KnowledgeCaptureAndDiscovery/knowledgecaptureanddiscovery.github.io"
#         expected = "https://api.github.com/repos/KnowledgeCaptureAndDiscovery/knowledgecaptureanddiscovery.github.io"
#         result = get_api_url(owner, repo, url)
#         self.assertEqual(result, expected, 
#                          f"Expected API URL to be {expected} but got {result}.")    


# if __name__ == '__main__':
#     unittest.main()
