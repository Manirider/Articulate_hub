"""AI Infrastructure Diagnostics Module

Provides startup and runtime health checks for AI services.
Ensures transparent AI availability status.
"""

import asyncio
from dataclasses import dataclass
from typing import Optional
from enum import Enum

from openai import AsyncOpenAI

from app.core.config import settings


class AIServiceStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    NOT_CONFIGURED = "not_configured"


@dataclass
class AIServiceHealth:
    service: str
    status: AIServiceStatus
    latency_ms: Optional[float] = None
    error_message: Optional[str] = None
    model: Optional[str] = None


@dataclass
class AIInfrastructureReport:
    overall_status: AIServiceStatus
    services: list[AIServiceHealth]
    timestamp: str
    recommendations: list[str]


class AIDiagnostics:
    """Runtime diagnostics for AI infrastructure."""

    def __init__(self):
        self._openai_client: Optional[AsyncOpenAI] = None
        self._cached_report: Optional[AIInfrastructureReport] = None
        self._cache_ttl_seconds = 60

    def _get_openai_client(self) -> Optional[AsyncOpenAI]:
        """Get or create OpenAI client if API key is configured."""
        if self._openai_client:
            return self._openai_client

        key = settings.openai_api_key
        if not key or key.startswith("YOUR_") or len(key) < 20:
            return None

        self._openai_client = AsyncOpenAI(api_key=key)
        return self._openai_client

    async def check_openai_health(self) -> AIServiceHealth:
        """Check OpenAI API health with a lightweight request."""
        import time

        client = self._get_openai_client()
        if not client:
            return AIServiceHealth(
                service="openai",
                status=AIServiceStatus.NOT_CONFIGURED,
                error_message="OPENAI_API_KEY not configured or is placeholder"
            )

        start_time = time.time()
        try:
            # Use a simple, cheap completion to test connectivity
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=5
            )
            latency_ms = (time.time() - start_time) * 1000

            return AIServiceHealth(
                service="openai",
                status=AIServiceStatus.HEALTHY,
                latency_ms=latency_ms,
                model=response.model
            )
        except Exception as e:
            return AIServiceHealth(
                service="openai",
                status=AIServiceStatus.UNAVAILABLE,
                error_message=str(e)
            )

    async def check_gladia_health(self) -> AIServiceHealth:
        """Check Gladia API health."""
        import httpx
        import time

        if not settings.gladia_api_key:
            return AIServiceHealth(
                service="gladia",
                status=AIServiceStatus.NOT_CONFIGURED,
                error_message="GLADIA_API_KEY not configured"
            )

        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {"x-gladia-key": settings.gladia_api_key}
                # Gladia doesn't have a direct health endpoint, so we check API version
                response = await client.get(
                    "https://api.gladia.io/v2/",
                    headers=headers
                )

                latency_ms = (time.time() - start_time) * 1000

                if response.status_code == 200:
                    return AIServiceHealth(
                        service="gladia",
                        status=AIServiceStatus.HEALTHY,
                        latency_ms=latency_ms
                    )
                else:
                    return AIServiceHealth(
                        service="gladia",
                        status=AIServiceStatus.DEGRADED,
                        latency_ms=latency_ms,
                        error_message=f"Status: {response.status_code}"
                    )
        except Exception as e:
            return AIServiceHealth(
                service="gladia",
                status=AIServiceStatus.UNAVAILABLE,
                error_message=str(e)
            )

    async def run_full_diagnostics(self) -> AIInfrastructureReport:
        """Run complete AI infrastructure diagnostics."""
        from datetime import datetime, timezone

        # Run all checks in parallel
        results = await asyncio.gather(
            self.check_openai_health(),
            self.check_gladia_health(),
            return_exceptions=True
        )

        services = []
        recommendations = []

        for result in results:
            if isinstance(result, Exception):
                continue
            services.append(result)

            # Generate recommendations based on status
            if result.status == AIServiceStatus.NOT_CONFIGURED:
                recommendations.append(
                    f"Configure {result.service.upper()}_API_KEY for full AI capabilities"
                )
            elif result.status == AIServiceStatus.UNAVAILABLE:
                recommendations.append(
                    f"{result.service} is unavailable - check network connectivity and API key validity"
                )
            elif result.status == AIServiceStatus.DEGRADED:
                recommendations.append(
                    f"{result.service} is experiencing degraded performance"
                )

        # Determine overall status
        statuses = [s.status for s in services]
        if all(s == AIServiceStatus.NOT_CONFIGURED for s in statuses):
            overall = AIServiceStatus.NOT_CONFIGURED
        elif any(s == AIServiceStatus.UNAVAILABLE for s in statuses):
            overall = AIServiceStatus.DEGRADED if any(
                s == AIServiceStatus.HEALTHY for s in statuses
            ) else AIServiceStatus.UNAVAILABLE
        elif any(s == AIServiceStatus.DEGRADED for s in statuses):
            overall = AIServiceStatus.DEGRADED
        else:
            overall = AIServiceStatus.HEALTHY

        return AIInfrastructureReport(
            overall_status=overall,
            services=services,
            timestamp=datetime.now(timezone.utc).isoformat(),
            recommendations=recommendations or ["AI infrastructure is fully operational"]
        )

    def is_ai_available(self) -> bool:
        """Quick check if AI is configured without making API calls."""
        key = settings.openai_api_key
        return bool(key and not key.startswith("YOUR_") and len(key) > 20)

    def require_ai_or_raise(self, feature_name: str = "This feature"):
        """Explicitly require AI or raise a clear error."""
        if not self.is_ai_available():
            raise RuntimeError(
                f"{feature_name} requires AI services. "
                "Please configure OPENAI_API_KEY in your environment. "
                "See env.example for setup instructions."
            )


# Global diagnostics instance
ai_diagnostics = AIDiagnostics()
