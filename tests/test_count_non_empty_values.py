"""
Module: test_count_non_empty_values

This module contains unit tests for the `count_non_empty_values` function in the `meta_creator.count_extracted_metadata` module.
The purpose of these tests is to ensure that the `count_non_empty_values` function accurately counts the number of non-empty values in provided data structures.
The `test_count_non_empty_values` class defines test cases for various scenarios, including nested dictionaries, lists of dictionaries, and empty data structures.
"""

import unittest
from meta_creator.count_extracted_metadata import count_non_empty_values

class test_count_non_empty_values(unittest.TestCase):

    def test_count_non_empty_values(self):
        # Test case with a nested dictionary
        data = {
            '@type':'SoftwareSourceCode',
            'name': 'J',
            'dateModified': '2024-04-30',
            'contributor': {
                '@type': 'Person',
                'givenName': 'J',
                'email': 'john@example.com',
            },
            'programmingLanguage': ['Python', 'JavaScript', 'SQL']
        }
        self.assertEqual(count_non_empty_values(data), 9)

        # Test case with a list of dictionaries
        data = [
            {'@type': 'Person', 'givenName': 'J', 'familyName': 'B', 'email': 'j.b@institut.de'},
            {'@type': 'Person', 'givenName': 'M', 'familyName': 'C', 'email': 'm.c@institut.de'}
        ]
        self.assertEqual(count_non_empty_values(data), 8)

        # Test case with empty data
        data = {}
        self.assertEqual(count_non_empty_values(data), 0)

if __name__ == '__main__':
    unittest.main()
