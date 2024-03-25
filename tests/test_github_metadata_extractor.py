"""
Module: test_github_metadata_extractor

This module contains unit tests for the GitHub metadata extraction functionality.
The tests are designed to validate the behavior of the 'get_github_metadata' function
in extracting metadata from GitHub repositories.
"""

import os
import unittest
from meta_creator.github_metadata import get_github_metadata

GitHub_url = os.getenv('GH_URL')

class test_github_metadata_extractor(unittest.TestCase):
    """
    Unit tests for the GitHub metadata extraction functionality.

    This test class contains individual test cases to validate the behavior
    of the 'get_github_metadata' function in extracting metadata from GitHub repositories.
    """

    def test_valid_github_url(self):
        """
        Test the retrieval of GitHub metadata for a valid repository URL.
        """

        metadata = get_github_metadata(GitHub_url)
        self.assertIsNotNone(metadata)
        self.assertEqual(metadata["@type"], "SoftwareSourceCode")


    def test_api_connection_success(self):
        """
        Test handling of successful GitHub API connection
        """
        result = get_github_metadata(GitHub_url)
        self.assertIsNotNone(result)



if __name__ == '__main__':
    unittest.main()