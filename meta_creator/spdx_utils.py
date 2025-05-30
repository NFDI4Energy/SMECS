import requests
import re
from functools import lru_cache

SPDX_URL = 'https://raw.githubusercontent.com/spdx/license-list-data/master/json/licenses.json'

@lru_cache(maxsize=1)
def get_spdx_licenses():
    licenses = set()
    response = requests.get(SPDX_URL, timeout=10)
    response.raise_for_status()
    data = response.json()

    for license_entry in data.get("licenses", []):
        if not license_entry.get("isDeprecatedLicenseId", False):
            licenses.add(license_entry["licenseId"])

    return licenses

def extract_license_from_metadata(metadata):
    if not isinstance(metadata, dict):
        return None

    def extract_spdx_id_from_url(url):
        match = re.search(r'spdx\.org/licenses/([A-Za-z0-9\.-]+)', url)
        return match.group(1) if match else None

    license_data = metadata.get('license')

    if isinstance(license_data, list):
        for item in license_data:
            if isinstance(item, str):
                spdx_id = extract_spdx_id_from_url(item)
                if spdx_id:
                    return spdx_id

    if isinstance(license_data, dict):
        return license_data.get('spdx_id') or license_data.get('key')

    if isinstance(license_data, str):
        return extract_spdx_id_from_url(license_data) or license_data.strip()

    if 'spdx_license' in metadata:
        return metadata['spdx_license'].strip()

    return None

def validate_license(metadata):
    license_id = extract_license_from_metadata(metadata)

    if not license_id:
        return {'success': False}

    spdx_licenses = get_spdx_licenses()
    if license_id in spdx_licenses:
        return {'success': True}
    else:
        return {'success': False}