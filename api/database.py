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
        "endpoints": ["api.openai.com", "chat.openai.com"],
        "likely_regions": ["us-east-1", "us-west-2"],
        "detection_accuracy": "95%",
        "typical_power_watts": 400,
    },
    "anthropic": {
        "display_name": "Anthropic (Claude)",
        "endpoints": ["api.anthropic.com"],
        "likely_regions": ["us-west-2"],
        "detection_accuracy": "95%",
        "typical_power_watts": 400,
    },
    "cohere": {
        "display_name": "Cohere",
        "endpoints": ["api.cohere.ai", "api.cohere.com"],
        "likely_regions": ["us-east-1"],
        "detection_accuracy": "90%",
        "typical_power_watts": 350,
    },
    "huggingface": {
        "display_name": "Hugging Face",
        "endpoints": ["api-inference.huggingface.co", "huggingface.co"],
        "likely_regions": ["us-east-1"],
        "detection_accuracy": "85%",
        "typical_power_watts": 300,
    },
    "azure-openai": {
        "display_name": "Azure OpenAI",
        "endpoints": ["openai.azure.com"],
        "likely_regions": ["dynamic"],
        "detection_accuracy": "90%",
        "typical_power_watts": 400,
    },
    "aws-bedrock": {
        "display_name": "AWS Bedrock",
        "endpoints": ["bedrock-runtime"],
        "likely_regions": ["dynamic"],
        "detection_accuracy": "90%",
        "typical_power_watts": 400,
    },
}


# Datacenter Database with Carbon Intensity
DATACENTER_DATABASE = {
    "aws": {
        # North America
        "us-east-1": {
            "country": "US",
            "city": "Virginia",
            "coords": [38.13, -78.45],
            "intensity_g_kwh": 380,
            "renewable_pct": 30,
        },
        "us-east-2": {
            "country": "US",
            "city": "Ohio",
            "coords": [40.42, -82.91],
            "intensity_g_kwh": 450,
            "renewable_pct": 20,
        },
        "us-west-1": {
            "country": "US",
            "city": "California",
            "coords": [37.35, -121.96],
            "intensity_g_kwh": 220,
            "renewable_pct": 60,
        },
        "us-west-2": {
            "country": "US",
            "city": "Oregon",
            "coords": [45.52, -122.68],
            "intensity_g_kwh": 120,
            "renewable_pct": 75,
        },
        "ca-central-1": {
            "country": "CA",
            "city": "Montreal",
            "coords": [45.50, -73.57],
            "intensity_g_kwh": 30,
            "renewable_pct": 95,
        },
        # Europe
        "eu-west-1": {
            "country": "IE",
            "city": "Dublin",
            "coords": [53.35, -6.26],
            "intensity_g_kwh": 320,
            "renewable_pct": 40,
        },
        "eu-west-2": {
            "country": "GB",
            "city": "London",
            "coords": [51.51, -0.13],
            "intensity_g_kwh": 220,
            "renewable_pct": 50,
        },
        "eu-west-3": {
            "country": "FR",
            "city": "Paris",
            "coords": [48.86, 2.35],
            "intensity_g_kwh": 60,
            "renewable_pct": 90,
        },
        "eu-north-1": {
            "country": "SE",
            "city": "Stockholm",
            "coords": [59.33, 18.06],
            "intensity_g_kwh": 45,
            "renewable_pct": 95,
        },
        "eu-central-1": {
            "country": "DE",
            "city": "Frankfurt",
            "coords": [50.11, 8.68],
            "intensity_g_kwh": 380,
            "renewable_pct": 45,
        },
        "eu-south-1": {
            "country": "IT",
            "city": "Milan",
            "coords": [45.46, 9.19],
            "intensity_g_kwh": 280,
            "renewable_pct": 45,
        },
        # Asia Pacific
        "ap-northeast-1": {
            "country": "JP",
            "city": "Tokyo",
            "coords": [35.68, 139.69],
            "intensity_g_kwh": 450,
            "renewable_pct": 25,
        },
        "ap-northeast-2": {
            "country": "KR",
            "city": "Seoul",
            "coords": [37.57, 126.98],
            "intensity_g_kwh": 420,
            "renewable_pct": 10,
        },
        "ap-southeast-1": {
            "country": "SG",
            "city": "Singapore",
            "coords": [1.35, 103.82],
            "intensity_g_kwh": 400,
            "renewable_pct": 5,
        },
        "ap-southeast-2": {
            "country": "AU",
            "city": "Sydney",
            "coords": [-33.87, 151.21],
            "intensity_g_kwh": 550,
            "renewable_pct": 30,
        },
        "ap-south-1": {
            "country": "IN",
            "city": "Mumbai",
            "coords": [19.08, 72.88],
            "intensity_g_kwh": 650,
            "renewable_pct": 20,
        },
        # South America
        "sa-east-1": {
            "country": "BR",
            "city": "São Paulo",
            "coords": [-23.55, -46.63],
            "intensity_g_kwh": 100,
            "renewable_pct": 85,
        },
    },
    "azure": {
        # North America
        "eastus": {
            "country": "US",
            "city": "Virginia",
            "coords": [37.43, -79.43],
            "intensity_g_kwh": 380,
            "renewable_pct": 30,
        },
        "eastus2": {
            "country": "US",
            "city": "Virginia",
            "coords": [36.67, -78.38],
            "intensity_g_kwh": 380,
            "renewable_pct": 30,
        },
        "westus": {
            "country": "US",
            "city": "California",
            "coords": [37.78, -122.42],
            "intensity_g_kwh": 220,
            "renewable_pct": 60,
        },
        "westus2": {
            "country": "US",
            "city": "Washington",
            "coords": [47.23, -119.85],
            "intensity_g_kwh": 100,
            "renewable_pct": 80,
        },
        "westus3": {
            "country": "US",
            "city": "Arizona",
            "coords": [33.45, -112.07],
            "intensity_g_kwh": 400,
            "renewable_pct": 30,
        },
        "centralus": {
            "country": "US",
            "city": "Iowa",
            "coords": [41.59, -93.62],
            "intensity_g_kwh": 420,
            "renewable_pct": 45,
        },
        "canadacentral": {
            "country": "CA",
            "city": "Toronto",
            "coords": [43.65, -79.38],
            "intensity_g_kwh": 40,
            "renewable_pct": 90,
        },
        "canadaeast": {
            "country": "CA",
            "city": "Quebec",
            "coords": [46.81, -71.21],
            "intensity_g_kwh": 20,
            "renewable_pct": 98,
        },
        # Europe
        "norwayeast": {
            "country": "NO",
            "city": "Oslo",
            "coords": [59.91, 10.75],
            "intensity_g_kwh": 20,
            "renewable_pct": 98,
        },
        "swedencentral": {
            "country": "SE",
            "city": "Gävle",
            "coords": [60.67, 17.15],
            "intensity_g_kwh": 45,
            "renewable_pct": 95,
        },
        "westeurope": {
            "country": "NL",
            "city": "Amsterdam",
            "coords": [52.37, 4.89],
            "intensity_g_kwh": 320,
            "renewable_pct": 40,
        },
        "northeurope": {
            "country": "IE",
            "city": "Dublin",
            "coords": [53.35, -6.26],
            "intensity_g_kwh": 320,
            "renewable_pct": 40,
        },
        "uksouth": {
            "country": "GB",
            "city": "London",
            "coords": [51.51, -0.13],
            "intensity_g_kwh": 220,
            "renewable_pct": 50,
        },
        "ukwest": {
            "country": "GB",
            "city": "Cardiff",
            "coords": [51.48, -3.18],
            "intensity_g_kwh": 220,
            "renewable_pct": 50,
        },
        "francecentral": {
            "country": "FR",
            "city": "Paris",
            "coords": [48.86, 2.35],
            "intensity_g_kwh": 60,
            "renewable_pct": 90,
        },
        "germanywestcentral": {
            "country": "DE",
            "city": "Frankfurt",
            "coords": [50.11, 8.68],
            "intensity_g_kwh": 380,
            "renewable_pct": 45,
        },
        "switzerlandnorth": {
            "country": "CH",
            "city": "Zurich",
            "coords": [47.37, 8.54],
            "intensity_g_kwh": 35,
            "renewable_pct": 75,
        },
        # Asia Pacific
        "japaneast": {
            "country": "JP",
            "city": "Tokyo",
            "coords": [35.68, 139.69],
            "intensity_g_kwh": 450,
            "renewable_pct": 25,
        },
        "japanwest": {
            "country": "JP",
            "city": "Osaka",
            "coords": [34.69, 135.50],
            "intensity_g_kwh": 450,
            "renewable_pct": 25,
        },
        "koreacentral": {
            "country": "KR",
            "city": "Seoul",
            "coords": [37.57, 126.98],
            "intensity_g_kwh": 420,
            "renewable_pct": 10,
        },
        "southeastasia": {
            "country": "SG",
            "city": "Singapore",
            "coords": [1.35, 103.82],
            "intensity_g_kwh": 400,
            "renewable_pct": 5,
        },
        "australiaeast": {
            "country": "AU",
            "city": "Sydney",
            "coords": [-33.87, 151.21],
            "intensity_g_kwh": 550,
            "renewable_pct": 30,
        },
        "centralindia": {
            "country": "IN",
            "city": "Pune",
            "coords": [18.52, 73.86],
            "intensity_g_kwh": 650,
            "renewable_pct": 20,
        },
        # South America
        "brazilsouth": {
            "country": "BR",
            "city": "São Paulo",
            "coords": [-23.55, -46.63],
            "intensity_g_kwh": 100,
            "renewable_pct": 85,
        },
    },
    "gcp": {
        # North America
        "us-east1": {
            "country": "US",
            "city": "South Carolina",
            "coords": [33.84, -81.16],
            "intensity_g_kwh": 350,
            "renewable_pct": 35,
        },
        "us-east4": {
            "country": "US",
            "city": "Virginia",
            "coords": [39.02, -77.47],
            "intensity_g_kwh": 380,
            "renewable_pct": 30,
        },
        "us-central1": {
            "country": "US",
            "city": "Iowa",
            "coords": [41.26, -95.86],
            "intensity_g_kwh": 420,
            "renewable_pct": 45,
        },
        "us-west1": {
            "country": "US",
            "city": "Oregon",
            "coords": [45.60, -121.18],
            "intensity_g_kwh": 120,
            "renewable_pct": 75,
        },
        "us-west4": {
            "country": "US",
            "city": "Nevada",
            "coords": [36.17, -115.14],
            "intensity_g_kwh": 380,
            "renewable_pct": 35,
        },
        "northamerica-northeast1": {
            "country": "CA",
            "city": "Montreal",
            "coords": [45.50, -73.57],
            "intensity_g_kwh": 30,
            "renewable_pct": 95,
        },
        # Europe
        "europe-west1": {
            "country": "BE",
            "city": "St. Ghislain",
            "coords": [50.47, 3.82],
            "intensity_g_kwh": 180,
            "renewable_pct": 50,
        },
        "europe-west2": {
            "country": "GB",
            "city": "London",
            "coords": [51.51, -0.13],
            "intensity_g_kwh": 220,
            "renewable_pct": 50,
        },
        "europe-west3": {
            "country": "DE",
            "city": "Frankfurt",
            "coords": [50.11, 8.68],
            "intensity_g_kwh": 380,
            "renewable_pct": 45,
        },
        "europe-west4": {
            "country": "NL",
            "city": "Eemshaven",
            "coords": [53.44, 6.83],
            "intensity_g_kwh": 320,
            "renewable_pct": 40,
        },
        "europe-west6": {
            "country": "CH",
            "city": "Zurich",
            "coords": [47.37, 8.54],
            "intensity_g_kwh": 35,
            "renewable_pct": 75,
        },
        "europe-north1": {
            "country": "FI",
            "city": "Hamina",
            "coords": [60.57, 27.19],
            "intensity_g_kwh": 85,
            "renewable_pct": 65,
        },
        "europe-west9": {
            "country": "FR",
            "city": "Paris",
            "coords": [48.86, 2.35],
            "intensity_g_kwh": 60,
            "renewable_pct": 90,
        },
        # Asia Pacific
        "asia-northeast1": {
            "country": "JP",
            "city": "Tokyo",
            "coords": [35.68, 139.69],
            "intensity_g_kwh": 450,
            "renewable_pct": 25,
        },
        "asia-northeast2": {
            "country": "JP",
            "city": "Osaka",
            "coords": [34.69, 135.50],
            "intensity_g_kwh": 450,
            "renewable_pct": 25,
        },
        "asia-northeast3": {
            "country": "KR",
            "city": "Seoul",
            "coords": [37.57, 126.98],
            "intensity_g_kwh": 420,
            "renewable_pct": 10,
        },
        "asia-southeast1": {
            "country": "SG",
            "city": "Singapore",
            "coords": [1.35, 103.82],
            "intensity_g_kwh": 400,
            "renewable_pct": 5,
        },
        "asia-south1": {
            "country": "IN",
            "city": "Mumbai",
            "coords": [19.08, 72.88],
            "intensity_g_kwh": 650,
            "renewable_pct": 20,
        },
        "australia-southeast1": {
            "country": "AU",
            "city": "Sydney",
            "coords": [-33.87, 151.21],
            "intensity_g_kwh": 550,
            "renewable_pct": 30,
        },
        # South America
        "southamerica-east1": {
            "country": "BR",
            "city": "São Paulo",
            "coords": [-23.55, -46.63],
            "intensity_g_kwh": 100,
            "renewable_pct": 85,
        },
    },
}


# Country-level grid intensity (fallback when region unknown)
COUNTRY_GRID_INTENSITY = {
    # North America
    "US": 400,  # United States average
    "CA": 30,  # Canada (hydro-heavy)
    "MX": 450,  # Mexico
    # Europe - Nordic (very clean)
    "NO": 20,  # Norway (hydro)
    "SE": 45,  # Sweden (hydro + nuclear)
    "FI": 85,  # Finland (nuclear + hydro)
    "DK": 120,  # Denmark (wind)
    "IS": 15,  # Iceland (geothermal + hydro)
    # Europe - Nuclear heavy (clean)
    "FR": 60,  # France (nuclear)
    "CH": 35,  # Switzerland (hydro + nuclear)
    # Europe - Mixed
    "GB": 220,  # Great Britain
    "IE": 320,  # Ireland
    "NL": 320,  # Netherlands
    "BE": 180,  # Belgium
    "AT": 95,  # Austria (hydro)
    "ES": 220,  # Spain
    "IT": 280,  # Italy
    "PT": 250,  # Portugal
    # Europe - Coal heavy
    "DE": 380,  # Germany
    "PL": 700,  # Poland (coal)
    "CZ": 450,  # Czech Republic
    "GR": 400,  # Greece
    # Asia Pacific
    "JP": 450,  # Japan
    "KR": 420,  # South Korea
    "CN": 550,  # China
    "IN": 650,  # India (coal heavy)
    "SG": 400,  # Singapore
    "AU": 550,  # Australia (coal)
    "NZ": 100,  # New Zealand (renewables)
    "TW": 500,  # Taiwan
    "HK": 450,  # Hong Kong
    # South America
    "BR": 100,  # Brazil (hydro)
    "AR": 350,  # Argentina
    "CL": 350,  # Chile
    "CO": 200,  # Colombia (hydro)
    # Middle East & Africa
    "AE": 450,  # UAE
    "SA": 550,  # Saudi Arabia
    "IL": 480,  # Israel
    "ZA": 700,  # South Africa (coal)
    # Aggregates
    "EU": 275,  # EU average
}


def get_grid_intensity(provider: str = None, region: str = None, country_code: str = None) -> dict:
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
                    "renewable_pct": dc_data.get("renewable_pct"),
                }

    # Try country code
    if country_code:
        country_upper = country_code.upper()
        if country_upper in COUNTRY_GRID_INTENSITY:
            return {
                "intensity_g_per_kwh": COUNTRY_GRID_INTENSITY[country_upper],
                "source": "country",
                "country": country_upper,
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
                        "country": dc_data["country"],
                    }

    # Fall back to global average
    return {
        "intensity_g_per_kwh": 400,  # Conservative global average
        "source": "global_average",
        "note": "Using global average - actual may vary",
    }
