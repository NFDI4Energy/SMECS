import unittest
from meta_creator.token_check import validate_repo_and_token

"""
This module contains unit tests for validating the behavior of the
`validate_repo_and_token` function, which checks the repository URLs and
the access tokens for GitHub and GitLab.

The tests cover common error cases such as:
- Invalid repository URLs
- Invalid tokens
- Unsupported repository hosts (like Bitbucket)

There is also a test to confirm that the function succeeds when both the URL
and token are valid. This requires a valid personal access token, and should only
be entered into the tests locally, for local testing purposes. 
"""


class TestTokenValidation(unittest.TestCase):

    def test_invalid_github_url(self):
        url = "https://github.com/invalid_user/invalid_repo"
        token = "ghp_invalidToken111"
        success, message = validate_repo_and_token(url, token)
        self.assertFalse(success)
        self.assertIn("URL error", message)

    def test_invalid_token_valid_url(self):
        url = "https://github.com/NFDI4Energy/SMECS"
        token = "ghp_invalidToken222"
        success, message = validate_repo_and_token(url, token)
        self.assertFalse(success)
        self.assertIn("Token error", message)

    def test_malformed_url(self):
        url = "no_url"
        token = "ghp_invalidToken333"
        success, message = validate_repo_and_token(url, token)
        self.assertFalse(success)
        self.assertIn("URL error", message)

    def test_unknown_host(self):
        url = "https://bitbucket.org/user/repo"
        token = "ghp_invalidToken444"
        success, message = validate_repo_and_token(url, token)
        self.assertFalse(success)
        self.assertIn("URL error", message)

    @unittest.skip("Requires real GitHub token")    # Comment out this line when testing with personal access token
    def test_valid_github_token(self):
        url = "https://github.com/octocat/Hello-World"
        token = "ghp_yourValidTokenHere"    # Replace str with personal access token
        success, message = validate_repo_and_token(url, token)
        self.assertTrue(success)
        self.assertIn("valid", message.lower())


if __name__ == '__main__':
    unittest.main()

