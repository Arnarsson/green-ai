"""
Provider and Datacenter Database
---------------------------------
Contains known information about:
- AI providers and their endpoints
- Datacenter regions and carbon intensity
- Grid carbon intensity by country/region

Phase 1: Static data from research
Phase 2: Will add real-time grid data integration
"""

# AI Provider Database
PROVIDER_DATABASE = {
    "openai": {
        "display_name": "OpenAI",
        "endpoints": [
            "api.openai.com",
            "chat.openai.com"
        ],
        "likely_regions": ["us-east-1", "us-west-2"],
        "detection_accuracy": "95%",
        "typical_power_watts": 400
    },
    "anthropic": {
        "display_name": "Anthropic (Claude)",
        "endpoints": [
            "api.anthropic.com"
        ],
        "likely_regions": ["us-west-2"],
        "detection_accuracy": "95%",
        "typical_power_watts": 400
    },
    "cohere": {
        "display_name": "Cohere",
        "endpoints": [
            "api.cohere.ai",
            "api.cohere.com"
        ],
        "likely_regions": ["us-east-1"],
        "detection_accuracy": "90%",
        "typical_power_watts": 350
    },
    "huggingface": {
        "display_name": "Hugging Face",
        "endpoints": [
            "api-inference.huggingface.co",
            "huggingface.co"
        ],
        "likely_regions": ["us-east-1"],
        "detection_accuracy": "85%",
        "typical_power_watts": 300
    },
    "azure-openai": {
        "display_name": "Azure OpenAI",
        "endpoints": [
            "openai.azure.com"
        ],
        "likely_regions": ["dynamic"],
        "detection_accuracy": "90%",
        "typical_power_watts": 400
    },
    "aws-bedrock": {
        "display_name": "AWS Bedrock",
        "endpoints": [
            "bedrock-runtime"
        ],
        "likely_regions": ["dynamic"],
        "detection_accuracy": "90%",
        "typical_power_watts": 400
    }
}


# Datacenter Database with Carbon Intensity
DATACENTER_DATABASE = {
    "aws": {
        "us-east-1": {
            "country": "US",
            "city": "Virginia",
            "coords": [38.13, -78.45],
            "intensity_g_kwh": 380,
            "renewable_pct": 30
        },
        "us-west-2": {
            "country": "US",
            "city": "Oregon",
            "coords": [45.52, -122.68],
            "intensity_g_kwh": 120,
            "renewable_pct": 75
        },
        "eu-west-1": {
            "country": "IE",
            "city": "Dublin",
            "coords": [53.35, -6.26],
            "intensity_g_kwh": 320,
            "renewable_pct": 40
        },
        "eu-north-1": {
            "country": "SE",
            "city": "Stockholm",
            "coords": [59.33, 18.06],
            "intensity_g_kwh": 45,
            "renewable_pct": 95
        },
        "eu-central-1": {
            "country": "DE",
            "city": "Frankfurt",
            "coords": [50.11, 8.68],
            "intensity_g_kwh": 380,
            "renewable_pct": 45
        }
    },
    "azure": {
        "norwayeast": {
            "country": "NO",
            "city": "Oslo",
            "coords": [59.91, 10.75],
            "intensity_g_kwh": 20,
            "renewable_pct": 98
        },
        "westeurope": {
            "country": "NL",
            "city": "Amsterdam",
            "coords": [52.37, 4.89],
            "intensity_g_kwh": 320,
            "renewable_pct": 40
        },
        "francecentral": {
            "country": "FR",
            "city": "Paris",
            "coords": [48.86, 2.35],
            "intensity_g_kwh": 60,
            "renewable_pct": 70
        },
        "germanywestcentral": {
            "country": "DE",
            "city": "Frankfurt",
            "coords": [50.11, 8.68],
            "intensity_g_kwh": 380,
            "renewable_pct": 45
        },
        "northeurope": {
            "country": "IE",
            "city": "Dublin",
            "coords": [53.35, -6.26],
            "intensity_g_kwh": 320,
            "renewable_pct": 40
        }
    },
    "gcp": {
        "us-east1": {
            "country": "US",
            "city": "South Carolina",
            "coords": [33.84, -81.16],
            "intensity_g_kwh": 350,
            "renewable_pct": 35
        },
        "europe-west1": {
            "country": "BE",
            "city": "St. Ghislain",
            "coords": [50.47, 3.82],
            "intensity_g_kwh": 180,
            "renewable_pct": 50
        },
        "europe-north1": {
            "country": "FI",
            "city": "Hamina",
            "coords": [60.57, 27.19],
            "intensity_g_kwh": 85,
            "renewable_pct": 65
        }
    }
}


# Country-level grid intensity (fallback when region unknown)
COUNTRY_GRID_INTENSITY = {
    "US": 400,   # United States average
    "IE": 320,   # Ireland
    "GB": 220,   # Great Britain
    "DK": 120,   # Denmark
    "NO": 20,    # Norway
    "SE": 45,    # Sweden
    "FI": 85,    # Finland
    "FR": 60,    # France
    "DE": 380,   # Germany
    "NL": 320,   # Netherlands
    "BE": 180,   # Belgium
    "AT": 95,    # Austria
    "CH": 35,    # Switzerland
    "ES": 220,   # Spain
    "IT": 280,   # Italy
    "PT": 250,   # Portugal
    "PL": 700,   # Poland
    "CZ": 450,   # Czech Republic
    "EU": 275,   # EU average
}


def get_grid_intensity(
    provider: str = None,
    region: str = None,
    country_code: str = None
) -> dict:
    """
    Get grid carbon intensity for a provider/region/country.

    Priority:
    1. Specific datacenter region (most accurate)
    2. Country code
    3. Provider's likely region
    4. Global average

    Returns:
        dict with intensity and metadata
    """

    # Try specific datacenter region
    if provider and region:
        # Check if provider has datacenters
        if provider in ["aws", "azure", "gcp"]:
            datacenters = DATACENTER_DATABASE.get(provider, {})
            if region in datacenters:
                dc_data = datacenters[region]
                return {
                    "intensity_g_per_kwh": dc_data["intensity_g_kwh"],
                    "source": "datacenter",
                    "provider": provider,
                    "region": region,
                    "country": dc_data["country"],
                    "renewable_pct": dc_data.get("renewable_pct")
                }

    # Try country code
    if country_code:
        country_upper = country_code.upper()
        if country_upper in COUNTRY_GRID_INTENSITY:
            return {
                "intensity_g_per_kwh": COUNTRY_GRID_INTENSITY[country_upper],
                "source": "country",
                "country": country_upper
            }

    # Try provider's likely regions
    if provider in PROVIDER_DATABASE:
        likely_regions = PROVIDER_DATABASE[provider]["likely_regions"]
        if likely_regions and likely_regions[0] != "dynamic":
            # Use first likely region
            region_code = likely_regions[0]

            # Try to find in datacenters
            for dc_provider, datacenters in DATACENTER_DATABASE.items():
                if region_code in datacenters:
                    dc_data = datacenters[region_code]
                    return {
                        "intensity_g_per_kwh": dc_data["intensity_g_kwh"],
                        "source": "provider_default",
                        "provider": dc_provider,
                        "region": region_code,
                        "country": dc_data["country"]
                    }

    # Fall back to global average
    return {
        "intensity_g_per_kwh": 400,  # Conservative global average
        "source": "global_average",
        "note": "Using global average - actual may vary"
    }
