import os
import unittest
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile
from meta_creator.import_metadata import parse_jsonld_file, validate_import_file, ImportError
from meta_creator.validate_jsonLD import validate_jsonld


class TestImportMetadata(unittest.TestCase):

    def test_parse_valid_json_file(self):
        valid_json = b'{"@context": "https://w3id.org/codemeta/3.0", "@type": "SoftwareSourceCode", "name": "Test"}'
        uploaded_file = SimpleUploadedFile("test.json", valid_json, content_type="application/json")
        result = parse_jsonld_file(uploaded_file)
        self.assertEqual(result["name"], "Test")

    def test_parse_empty_file(self):
        uploaded_file = SimpleUploadedFile("empty.json", b"", content_type="application/json")
        with self.assertRaises(ImportError) as ctx:
            parse_jsonld_file(uploaded_file)
        self.assertIn("empty", str(ctx.exception).lower())

    def test_parse_invalid_json(self):
        invalid_json = b'not valid json {'
        uploaded_file = SimpleUploadedFile("bad.json", invalid_json, content_type="application/json")
        with self.assertRaises(ImportError) as ctx:
            parse_jsonld_file(uploaded_file)
        self.assertIn("invalid json", str(ctx.exception).lower())

    def test_parse_non_object_json(self):
        non_object_json = b'["array", "not", "object"]'
        uploaded_file = SimpleUploadedFile("array.json", non_object_json, content_type="application/json")
        with self.assertRaises(ImportError) as ctx:
            parse_jsonld_file(uploaded_file)
        self.assertIn("single object", str(ctx.exception).lower())

    def test_validate_missing_context(self):
        json_data = {"@type": "SoftwareSourceCode", "name": "Test"}
        is_valid, error = validate_import_file(json_data)
        self.assertFalse(is_valid)
        self.assertIn("@context", error)

    def test_validate_missing_type(self):
        json_data = {"@context": "https://w3id.org/codemeta/3.0", "name": "Test"}
        is_valid, error = validate_import_file(json_data)
        self.assertFalse(is_valid)
        self.assertIn("@type", error)

    def test_validate_unsupported_context(self):
        json_data = {
            "@context": "https://example.org/wrong",
            "@type": "SoftwareSourceCode",
            "name": "Test"
        }
        is_valid, error = validate_import_file(json_data)
        self.assertFalse(is_valid)
        self.assertIn("Unsupported @context", error)

    def test_validate_unsupported_type(self):
        json_data = {
            "@context": "https://w3id.org/codemeta/3.0",
            "@type": "SomeOtherType",
            "name": "Test"
        }
        is_valid, error = validate_import_file(json_data)
        self.assertFalse(is_valid)
        self.assertIn("Unsupported @type", error)

    def test_validate_codemeta_valid(self):
        json_data = {
            "@context": "https://w3id.org/codemeta/3.0",
            "@type": "SoftwareSourceCode",
            "name": "TestProject",
            "description": "A test project"
        }
        is_valid, error = validate_import_file(json_data)
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_ersmeta_valid(self):
        json_data = {
            "@context": "https://github.com/NFDI4Energy/ERSmeta/blob/main/schema/ersmeta.jsonld",
            "@type": "EnergyResearchSoftware",
            "name": "TestProject"
        }
        is_valid, error = validate_import_file(json_data)
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_jsonld_codemeta(self):
        json_data = {
            "@context": "https://w3id.org/codemeta/3.0",
            "@type": "SoftwareSourceCode",
            "name": "TestProject"
        }
        is_valid, error = validate_jsonld(json_data)
        self.assertTrue(is_valid)

    def test_validate_jsonld_ersmeta(self):
        json_data = {
            "@context": "https://github.com/NFDI4Energy/ERSmeta/blob/main/schema/ersmeta.jsonld",
            "@type": "EnergyResearchSoftware",
            "name": "TestProject"
        }
        is_valid, error = validate_jsonld(json_data)
        self.assertTrue(is_valid)

    def test_validate_jsonld_unsupported_context(self):
        json_data = {
            "@context": "https://example.org/unsupported",
            "@type": "SoftwareSourceCode",
            "name": "TestProject"
        }
        is_valid, error = validate_jsonld(json_data)
        self.assertFalse(is_valid)
        self.assertIn("Unsupported @context", error)

    def test_validate_jsonld_missing_fields(self):
        json_data = {"name": "TestProject"}
        is_valid, error = validate_jsonld(json_data)
        self.assertFalse(is_valid)


if __name__ == '__main__':
    unittest.main()