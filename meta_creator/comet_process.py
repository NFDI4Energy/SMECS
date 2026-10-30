"""
Extract metadata from a GitHub or GitLab repository through the COMET API.
"""

import logging
import os
from urllib.parse import urlsplit

import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)


logger = logging.getLogger(__name__)


COMET_API_URL = os.getenv(
    "COMET_API_URL",
    "http://localhost:8000",
)

COMET_METADATA_ENDPOINT = "/api/metadata/enriched"


def _request_error(exc):
    """Return a concise message for a failed COMET HTTP request."""
    if isinstance(exc, requests.ConnectionError):
        api_url = urlsplit(COMET_API_URL)
        host = api_url.hostname or COMET_API_URL
        port = f":{api_url.port}" if api_url.port else ""
        return (
            f"Could not connect to the COMET API at {host}{port}. "
            "Make sure the COMET service is running and COMET_API_URL points "
            "to the correct address, then try again."
        )
    if isinstance(exc, requests.Timeout):
        return (
            "The request to the COMET API timed out. The service may be busy; "
            "please try again."
        )
    if isinstance(exc, requests.HTTPError):
        status = exc.response.status_code if exc.response is not None else "unknown"
        return f"The COMET API returned HTTP {status}. Please try again later."
    return "The request to the COMET API failed. Please try again later."


def run_comet(repo_url, access_token=None, schema="ConnOSS", schema_class="Software"):
    """
    Call the COMET metadata extraction API.

    Parameters
    ----------
    repo_url : str
        URL of the GitHub or GitLab repository.
    access_token : str, optional
        Access token for private repositories.
    schema_class : str, optional
        Optional schema class supported by COMET.

    Returns
    -------
    dict
        Result in the format expected by SMECS:
        {
            "success": bool,
            "warnings": list,
            "errors": list,
            "metadata": dict | None,
            "enriched_metadata": dict | None,
        }
    """

    logger.info("Starting COMET metadata extraction")
    logger.info("Repository: %s", repo_url)
    logger.info("COMET API: %s", COMET_API_URL)

    params = {
        "repo_url": repo_url,
        "schema": schema,
        "schema_class": schema_class,
    }

    if access_token:
        params["access_token"] = access_token
        logger.info("Access token provided")
    else:
        logger.info("No access token provided")

    if schema_class:
        params["schema_class"] = schema_class
        logger.info("Schema class: %s", schema_class)

    if schema:
        params["schema"] = schema
        logger.info("Schema: %s", schema)

    else:
        logger.info("No schema class provided")

    endpoint = f"{COMET_API_URL}{COMET_METADATA_ENDPOINT}"
    logger.info("Calling COMET metadata endpoint: %s", endpoint)

    try:
        response = requests.get(
            endpoint,
            params=params,
            timeout=300,
        )

        logger.info(
            "COMET API responded with HTTP status: %s",
            response.status_code,
        )

        response.raise_for_status()

    except requests.RequestException as exc:
        message = _request_error(exc)
        logger.error("COMET API request failed: %s", message)

        return {
            "success": False,
            "warnings": [],
            "errors": [message],
            "metadata": None,
            "enriched_metadata": None,
        }

    logger.info("COMET API request completed successfully")
    logger.info("Parsing COMET response as JSON")

    try:
        comet_response = response.json()
    except ValueError as exc:
        logger.error("COMET returned invalid JSON: %s", exc)

        return {
            "success": False,
            "warnings": [],
            "errors": [f"COMET returned invalid JSON: {exc}"],
            "metadata": None,
            "enriched_metadata": None,
        }

    logger.info("COMET JSON response parsed successfully")

    # COMET reports its own application-level status.
    comet_status = comet_response.get("status")
    logger.info("COMET application status: %s", comet_status)

    if comet_status != "success":
        message = comet_response.get(
            "message",
            "COMET metadata extraction failed.",
        )

        logger.error("COMET metadata extraction failed: %s", message)

        return {
            "success": False,
            "warnings": [],
            "errors": [message],
            "metadata": None,
            "enriched_metadata": None,
        }

    logger.info("COMET metadata extraction reported success")

    metadata = comet_response.get("results")
    # logger.info("Metadata received from COMET: %s", metadata)
    enriched_metadata = comet_response.get("enriched_metadata")

    logger.info(
        "Metadata received: %s",
        "yes" if isinstance(metadata, dict) else "no",
    )

    logger.info(
        "Enriched metadata received: %s",
        "yes" if enriched_metadata is not None else "no",
    )

    if not isinstance(metadata, dict):
        logger.error(
            "COMET returned no metadata in the 'results' field"
        )

        return {
            "success": False,
            "warnings": [],
            "errors": ["COMET returned no metadata in the 'results' field."],
            "metadata": None,
            "enriched_metadata": enriched_metadata,
        }

    logger.info("COMET metadata extraction completed successfully")
    logger.info("Returning metadata to SMECS")

    return {
        "success": True,
        "warnings": [],
        "errors": [],
        "metadata": metadata,
        "enriched_metadata": enriched_metadata,
    }
