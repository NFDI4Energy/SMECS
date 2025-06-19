import unittest
from meta_creator.token_check import validate_repo_and_token


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

    @unittest.skip("Requires real GitHub token")
    def test_valid_github_token(self):
        url = "https://github.com/octocat/Hello-World"
        token = "ghp_yourValidTokenHere"
        success, message = validate_repo_and_token(url, token)
        self.assertTrue(success)
        self.assertIn("valid", message.lower())


if __name__ == '__main__':
    unittest.main()

