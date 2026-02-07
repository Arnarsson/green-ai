"""
Usage Analytics Module
----------------------
Tracks API usage and emissions statistics.

Phase 1: In-memory storage (resets on restart)
Phase 2: Persistent storage (Redis/PostgreSQL)
"""

from datetime import datetime, timezone
from collections import defaultdict
from threading import Lock
from typing import Optional
import statistics


class Analytics:
    """Thread-safe analytics tracker for API usage."""

    def __init__(self):
        self._lock = Lock()
        self._reset()

    def _reset(self):
        """Reset all analytics data."""
        self.start_time = datetime.now(timezone.utc)
        self.total_requests = 0
        self.total_emissions_g = 0.0
        self.total_energy_kwh = 0.0

        # Counters
        self.requests_by_endpoint = defaultdict(int)
        self.requests_by_provider = defaultdict(int)
        self.requests_by_region = defaultdict(int)
        self.requests_by_country = defaultdict(int)

        # Emissions tracking
        self.emissions_by_provider = defaultdict(float)
        self.emissions_by_region = defaultdict(float)

        # Recent emissions for percentile calculations
        self.recent_emissions = []
        self.max_recent = 1000  # Keep last 1000 for stats

    def track_estimate(
        self,
        endpoint: str,
        provider: Optional[str],
        region: Optional[str],
        country: Optional[str],
        emissions_g: float,
        energy_kwh: float,
    ):
        """Track an emissions estimate request."""
        with self._lock:
            self.total_requests += 1
            self.total_emissions_g += emissions_g
            self.total_energy_kwh += energy_kwh

            self.requests_by_endpoint[endpoint] += 1

            if provider:
                self.requests_by_provider[provider] += 1
                self.emissions_by_provider[provider] += emissions_g

            if region:
                self.requests_by_region[region] += 1
                self.emissions_by_region[region] += emissions_g

            if country:
                self.requests_by_country[country] += 1

            # Track recent emissions
            self.recent_emissions.append(emissions_g)
            if len(self.recent_emissions) > self.max_recent:
                self.recent_emissions.pop(0)

    def track_request(self, endpoint: str):
        """Track any API request (non-estimate endpoints)."""
        with self._lock:
            self.total_requests += 1
            self.requests_by_endpoint[endpoint] += 1

    def get_stats(self) -> dict:
        """Get current analytics statistics."""
        with self._lock:
            uptime = datetime.now(timezone.utc) - self.start_time
            uptime_hours = uptime.total_seconds() / 3600

            # Calculate emissions stats
            avg_emissions = 0.0
            median_emissions = 0.0
            p95_emissions = 0.0

            if self.recent_emissions:
                avg_emissions = statistics.mean(self.recent_emissions)
                median_emissions = statistics.median(self.recent_emissions)
                if len(self.recent_emissions) >= 20:
                    sorted_emissions = sorted(self.recent_emissions)
                    p95_index = int(len(sorted_emissions) * 0.95)
                    p95_emissions = sorted_emissions[p95_index]

            # Top providers/regions
            top_providers = sorted(
                self.requests_by_provider.items(), key=lambda x: x[1], reverse=True
            )[:5]
            top_regions = sorted(self.requests_by_region.items(), key=lambda x: x[1], reverse=True)[
                :5
            ]
            top_countries = sorted(
                self.requests_by_country.items(), key=lambda x: x[1], reverse=True
            )[:5]

            return {
                "uptime_hours": round(uptime_hours, 2),
                "start_time": self.start_time.isoformat(),
                "total_requests": self.total_requests,
                "requests_per_hour": (
                    round(self.total_requests / uptime_hours, 2) if uptime_hours > 0 else 0
                ),
                "emissions": {
                    "total_g": round(self.total_emissions_g, 4),
                    "total_kg": round(self.total_emissions_g / 1000, 6),
                    "average_g": round(avg_emissions, 4),
                    "median_g": round(median_emissions, 4),
                    "p95_g": round(p95_emissions, 4),
                },
                "energy": {
                    "total_kwh": round(self.total_energy_kwh, 6),
                },
                "top_providers": [{"name": p, "requests": c} for p, c in top_providers],
                "top_regions": [{"name": r, "requests": c} for r, c in top_regions],
                "top_countries": [{"code": c, "requests": n} for c, n in top_countries],
                "requests_by_endpoint": dict(self.requests_by_endpoint),
            }

    def reset(self):
        """Reset all analytics (useful for testing)."""
        with self._lock:
            self._reset()


# Global analytics instance
analytics = Analytics()
