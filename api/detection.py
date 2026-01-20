"""
AI Provider and Datacenter Detection Logic
-------------------------------------------
Phase 1 (MVP): ~70% accuracy using:
- Hostname pattern matching
- IP geolocation
- Latency analysis
- Header inspection

Phase 2: Will add ML and advanced techniques for 85%+ accuracy
"""

import asyncio
import logging
import socket
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlparse

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from .config import settings

logger = logging.getLogger(__name__)

# Simple in-memory cache for IP geolocation results
_ip_cache: dict[str, tuple[dict, datetime]] = {}

# Circuit breaker state for external services
_circuit_breaker_state = {"ip_api": {"failures": 0, "last_failure": None, "is_open": False}}
CIRCUIT_BREAKER_THRESHOLD = 5  # failures before opening circuit
CIRCUIT_BREAKER_RESET_TIME = 60  # seconds before trying again


def _get_cached_ip_result(ip: str) -> Optional[dict]:
    """Get cached IP geolocation result if not expired."""
    if ip in _ip_cache:
        result, cached_at = _ip_cache[ip]
        if datetime.now() - cached_at < timedelta(seconds=settings.ip_geolocation_cache_ttl):
            logger.debug(f"IP cache hit for {ip}")
            return result
        else:
            # Remove expired entry
            del _ip_cache[ip]
    return None


def _cache_ip_result(ip: str, result: dict) -> None:
    """Cache IP geolocation result."""
    _ip_cache[ip] = (result, datetime.now())
    # Limit cache size to prevent memory issues
    if len(_ip_cache) > 1000:
        # Remove oldest entries
        sorted_items = sorted(_ip_cache.items(), key=lambda x: x[1][1])
        for key, _ in sorted_items[:100]:
            del _ip_cache[key]


async def detect_provider_and_region(
    api_endpoint: str,
    request_headers: Optional[dict] = None,
    response_headers: Optional[dict] = None,
    latency_ms: int = 0,
) -> dict:
    """
    Detect AI provider and datacenter location.

    Strategy:
    1. Check hostname for known patterns (95% confidence)
    2. Analyze response headers for clues (80% confidence)
    3. Use IP geolocation (65% confidence)
    4. Use latency patterns (60% confidence)
    5. Fall back to best guess based on multiple signals

    Returns:
        dict with provider, region, country, confidence, method, and details
    """

    # Parse endpoint URL
    parsed_url = urlparse(api_endpoint)
    hostname = parsed_url.hostname

    if not hostname:
        return {
            "provider": "unknown",
            "region": "unknown",
            "country": "unknown",
            "confidence": "low",
            "method": "none",
            "details": {"error": "Invalid API endpoint"},
        }

    # Detection methods (in priority order)
    detection_methods = [
        _detect_by_hostname(hostname),
        _detect_by_headers(response_headers) if response_headers else None,
        await _detect_by_ip(hostname),
        _detect_by_latency(latency_ms) if latency_ms > 0 else None,
    ]

    # Combine results from all methods
    combined = _combine_detections(detection_methods)

    return combined


def _detect_by_hostname(hostname: str) -> dict:
    """
    Detect provider from hostname patterns.

    This is the most reliable method (95% confidence)
    """
    hostname_lower = hostname.lower()

    # Known provider patterns
    patterns = {
        "openai.com": {
            "provider": "openai",
            "display_name": "OpenAI",
            "likely_regions": ["us-east-1", "us-west-2"],
            "country": "US",
            "confidence": 0.95,
        },
        "anthropic.com": {
            "provider": "anthropic",
            "display_name": "Anthropic",
            "likely_regions": ["us-west-2"],
            "country": "US",
            "confidence": 0.95,
        },
        "cohere.ai": {
            "provider": "cohere",
            "display_name": "Cohere",
            "likely_regions": ["us-east-1"],
            "country": "US",
            "confidence": 0.95,
        },
        "huggingface.co": {
            "provider": "huggingface",
            "display_name": "Hugging Face",
            "likely_regions": ["us-east-1"],
            "country": "US",
            "confidence": 0.90,
        },
        "openai.azure.com": {
            "provider": "azure-openai",
            "display_name": "Azure OpenAI",
            "likely_regions": ["dynamic"],  # User-specified
            "country": "varies",
            "confidence": 0.85,
        },
        "bedrock": {
            "provider": "aws-bedrock",
            "display_name": "AWS Bedrock",
            "likely_regions": ["dynamic"],
            "country": "varies",
            "confidence": 0.85,
        },
    }

    # Check patterns
    for pattern, data in patterns.items():
        if pattern in hostname_lower:
            return {
                "provider": data["provider"],
                "region": data["likely_regions"][0] if data["likely_regions"] else "unknown",
                "country": data["country"],
                "confidence": data["confidence"],
                "method": "hostname",
                "details": {
                    "hostname": hostname,
                    "pattern_matched": pattern,
                    "all_likely_regions": data["likely_regions"],
                },
            }

    # Unknown provider
    return {
        "provider": "unknown",
        "region": "unknown",
        "country": "unknown",
        "confidence": 0.0,
        "method": "hostname",
        "details": {"hostname": hostname, "pattern_matched": None},
    }


def _detect_by_headers(headers: dict) -> Optional[dict]:
    """
    Analyze headers for datacenter/region clues.

    Confidence: ~80% when headers provide clear signals
    """
    if not headers:
        return None

    details = {}

    # Cloudflare Ray ID contains datacenter code
    if "cf-ray" in headers:
        cf_ray = headers["cf-ray"]
        # Format: 8a1234567890abcd-CPH (CPH = Copenhagen)
        if "-" in cf_ray:
            dc_code = cf_ray.split("-")[-1][:3]
            details["cloudflare_dc"] = dc_code

            # Map common CF datacenter codes to countries
            cf_dc_map = {
                "CPH": "DK",
                "AMS": "NL",
                "FRA": "DE",
                "LHR": "GB",
                "CDG": "FR",
                "MAD": "ES",
                "MIL": "IT",
                "STO": "SE",
                "IAD": "US",
                "ORD": "US",
                "ATL": "US",
                "SJC": "US",
            }

            country = cf_dc_map.get(dc_code, "unknown")
            if country != "unknown":
                return {
                    "provider": "cloudflare-proxied",
                    "region": dc_code.lower(),
                    "country": country,
                    "confidence": 0.70,  # CF is proxy, not actual compute
                    "method": "cf-ray-header",
                    "details": details,
                }

    # AWS headers
    if any(k.startswith("x-amzn-") for k in headers.keys()):
        details["aws_headers_found"] = True
        # Could parse request ID for region hints
        return {
            "provider": "aws-hosted",
            "region": "unknown",
            "country": "unknown",
            "confidence": 0.60,
            "method": "aws-headers",
            "details": details,
        }

    # Azure headers
    if any(k.startswith("x-ms-") for k in headers.keys()):
        details["azure_headers_found"] = True
        return {
            "provider": "azure-hosted",
            "region": "unknown",
            "country": "unknown",
            "confidence": 0.60,
            "method": "azure-headers",
            "details": details,
        }

    return None


def _check_circuit_breaker(service: str) -> bool:
    """Check if circuit breaker is open (should skip the call)."""
    state = _circuit_breaker_state.get(service, {})
    if not state.get("is_open"):
        return False

    # Check if enough time has passed to try again
    last_failure = state.get("last_failure")
    if (
        last_failure
        and (datetime.now() - last_failure).total_seconds() > CIRCUIT_BREAKER_RESET_TIME
    ):
        # Reset circuit breaker (half-open state)
        state["is_open"] = False
        state["failures"] = 0
        logger.info(f"Circuit breaker for {service} reset to half-open state")
        return False

    return True


def _record_failure(service: str) -> None:
    """Record a failure and potentially open the circuit breaker."""
    state = _circuit_breaker_state.setdefault(
        service, {"failures": 0, "last_failure": None, "is_open": False}
    )
    state["failures"] += 1
    state["last_failure"] = datetime.now()

    if state["failures"] >= CIRCUIT_BREAKER_THRESHOLD:
        state["is_open"] = True
        logger.warning(f"Circuit breaker for {service} OPENED after {state['failures']} failures")


def _record_success(service: str) -> None:
    """Record a success and reset failure count."""
    state = _circuit_breaker_state.get(service)
    if state:
        state["failures"] = 0
        state["is_open"] = False


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=2),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def _fetch_ip_geolocation(ip: str) -> Optional[dict]:
    """Fetch IP geolocation with tenacity retry logic."""
    async with httpx.AsyncClient() as client:
        url = f"http://ip-api.com/json/{ip}"
        params = "?fields=status,country,countryCode,city,lat,lon,isp"
        response = await client.get(
            url + params,
            timeout=settings.ip_geolocation_timeout,
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success":
                return data
        return None


async def _detect_by_ip(hostname: str) -> Optional[dict]:
    """
    Use IP geolocation to estimate location.

    Confidence: ~65% (IP shows edge/proxy, not always compute location)
    Includes circuit breaker, retry logic, and caching.
    """
    # Check circuit breaker first
    if _check_circuit_breaker("ip_api"):
        logger.debug("Circuit breaker open for ip_api, skipping geolocation")
        return None

    try:
        # Resolve hostname to IP
        ip = socket.gethostbyname(hostname)

        # Check cache first
        cached_result = _get_cached_ip_result(ip)
        if cached_result:
            return cached_result

        # Fetch with retry logic
        data = await _fetch_ip_geolocation(ip)

        if data:
            result = {
                "provider": "detected-via-ip",
                "region": data.get("city", "unknown").lower(),
                "country": data.get("countryCode", "unknown"),
                "confidence": 0.65,
                "method": "ip-geolocation",
                "details": {
                    "ip": ip,
                    "city": data.get("city"),
                    "coordinates": [data.get("lat"), data.get("lon")],
                    "isp": data.get("isp"),
                },
            }
            # Cache the result
            _cache_ip_result(ip, result)
            _record_success("ip_api")
            return result

    except (httpx.TimeoutException, httpx.ConnectError) as e:
        _record_failure("ip_api")
        logger.warning(f"IP geolocation failed for {hostname} after retries: {e}")
    except socket.gaierror as e:
        logger.warning(f"DNS resolution failed for {hostname}: {e}")
    except Exception as e:
        _record_failure("ip_api")
        logger.warning(f"IP geolocation failed for {hostname}: {e}")

    return None


def _detect_by_latency(latency_ms: int) -> Optional[dict]:
    """
    Use latency patterns to estimate location.

    Confidence: ~60% (rough estimate only)

    Latency patterns:
    - <50ms: Same region/country
    - 50-100ms: Same continent
    - 100-200ms: Cross-continental
    - >200ms: Very distant or slow network
    """
    if latency_ms < 50:
        return {
            "provider": "latency-inferred",
            "region": "same-region",
            "country": "unknown",
            "confidence": 0.50,
            "method": "latency-pattern",
            "details": {"latency_ms": latency_ms, "interpretation": "Same region (< 50ms)"},
        }
    elif latency_ms < 100:
        return {
            "provider": "latency-inferred",
            "region": "same-continent",
            "country": "unknown",
            "confidence": 0.40,
            "method": "latency-pattern",
            "details": {"latency_ms": latency_ms, "interpretation": "Same continent (50-100ms)"},
        }
    elif latency_ms < 200:
        return {
            "provider": "latency-inferred",
            "region": "cross-continental",
            "country": "unknown",
            "confidence": 0.30,
            "method": "latency-pattern",
            "details": {
                "latency_ms": latency_ms,
                "interpretation": "Cross-continental (100-200ms)",
            },
        }

    return None


def _combine_detections(detections: list[Optional[dict]]) -> dict:
    """
    Combine results from multiple detection methods.

    Strategy:
    1. Use highest confidence result as primary
    2. Fill in missing data from lower confidence results
    3. Mark overall confidence
    """
    # Filter out None results
    valid_detections = [d for d in detections if d is not None]

    if not valid_detections:
        return {
            "provider": "unknown",
            "region": "unknown",
            "country": "unknown",
            "confidence": "low",
            "method": "none",
            "details": {"all_methods_failed": True},
        }

    # Sort by confidence (highest first)
    sorted_detections = sorted(valid_detections, key=lambda x: x.get("confidence", 0), reverse=True)

    # Start with highest confidence result
    primary = sorted_detections[0]

    # Fill in missing data from other methods
    for detection in sorted_detections[1:]:
        if primary.get("region") == "unknown" and detection.get("region") != "unknown":
            primary["region"] = detection["region"]
        if primary.get("country") == "unknown" and detection.get("country") != "unknown":
            primary["country"] = detection["country"]

    # Map confidence score to label
    conf_score = primary.get("confidence", 0)
    if conf_score >= 0.80:
        conf_label = "high"
    elif conf_score >= 0.60:
        conf_label = "medium"
    else:
        conf_label = "low"

    # Add all detection details
    primary["confidence"] = conf_label
    primary["confidence_score"] = conf_score
    primary["all_detections"] = sorted_detections

    return primary
