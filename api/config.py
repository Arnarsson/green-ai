"""
Centralized Configuration Management
------------------------------------
All application configuration loaded from environment variables
with sensible defaults for development.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = Field(default="Green AI API", description="Application name")
    app_version: str = Field(default="2.0.0", description="Application version")
    environment: str = Field(
        default="development", description="Environment (development/staging/production)"
    )
    debug: bool = Field(default=False, description="Enable debug mode")

    # Server
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    workers: int = Field(default=2, description="Number of workers")

    # Logging
    log_level: str = Field(default="INFO", description="Log level (DEBUG/INFO/WARNING/ERROR)")
    log_format: str = Field(default="json", description="Log format (json/text)")

    # Rate Limiting
    rate_limit_requests: int = Field(default=100, description="Rate limit requests per period")
    rate_limit_period: str = Field(
        default="hour", description="Rate limit period (second/minute/hour/day)"
    )

    # CORS
    cors_origins: str = Field(default="*", description="Comma-separated list of allowed origins")
    cors_allow_credentials: bool = Field(default=True, description="Allow credentials in CORS")

    # Default Calculation Values
    default_power_watts: float = Field(
        default=400.0, description="Default power consumption in watts"
    )
    default_pue: float = Field(default=1.2, description="Default Power Usage Effectiveness")
    global_average_intensity: float = Field(
        default=400.0, description="Global average grid intensity (g CO2/kWh)"
    )

    # External Services
    ip_geolocation_timeout: float = Field(
        default=5.0, description="IP geolocation API timeout in seconds"
    )
    ip_geolocation_cache_ttl: int = Field(
        default=86400, description="IP geolocation cache TTL in seconds (24h)"
    )

    # Redis (optional)
    redis_host: Optional[str] = Field(
        default=None, description="Redis host for distributed rate limiting"
    )
    redis_port: int = Field(default=6379, description="Redis port")
    redis_db: int = Field(default=0, description="Redis database number")

    # Monitoring (optional)
    sentry_dsn: Optional[str] = Field(default=None, description="Sentry DSN for error tracking")
    datadog_api_key: Optional[str] = Field(default=None, description="Datadog API key for metrics")
    enable_metrics: bool = Field(default=True, description="Enable Prometheus metrics endpoint")

    # OpenRouter (for real datacenter detection)
    openrouter_api_key: Optional[str] = Field(
        default=None, description="OpenRouter API key for real datacenter detection"
    )
    openrouter_max_calls_per_session: int = Field(
        default=3, description="Max OpenRouter detection calls per session"
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def rate_limit_string(self) -> str:
        """Get rate limit as slowapi format string."""
        return f"{self.rate_limit_requests}/{self.rate_limit_period}"

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Uses lru_cache to ensure settings are only loaded once.
    """
    return Settings()


# Convenience access to settings
settings = get_settings()
