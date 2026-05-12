"""
OpenTelemetry distributed tracing configuration.

Production-grade observability setup with:
- Resource attribution (service name, version, environment)
- OTLP exporter for Jaeger / Datadog / New Relic
- Auto-instrumentation for FastAPI, SQLAlchemy, Redis
- Custom span decorator for business-logic tracing
- AI pipeline latency metrics

All OpenTelemetry imports are lazy to avoid hard failures when
instrumentation packages are not installed (e.g. test environments).
"""

import functools
import time
import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)

# ── Lazy tracer – works even if opentelemetry is not installed ───────────

_tracer = None


def _get_tracer():
    global _tracer
    if _tracer is None:
        try:
            from opentelemetry import trace
            _tracer = trace.get_tracer("ai-communication-coach")
        except ImportError:
            _tracer = None
    return _tracer


def setup_telemetry(app):
    """Configure OpenTelemetry for distributed tracing and metrics."""
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION, DEPLOYMENT_ENVIRONMENT
    except ImportError:
        logger.warning(
            "OpenTelemetry packages not installed — tracing disabled. "
            "Install with: pip install opentelemetry-sdk opentelemetry-instrumentation-fastapi"
        )
        return None

    from app.core.config import settings

    # Resource configuration
    resource = Resource.create({
        SERVICE_NAME: "ai-communication-coach",
        SERVICE_VERSION: "2.0.0",
        DEPLOYMENT_ENVIRONMENT: settings.environment,
    })

    # ── Tracing ──────────────────────────────────────────────────────

    provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(provider)

    # OTLP exporter (for Jaeger, Datadog, New Relic)
    otlp_endpoint = getattr(settings, 'otel_exporter_otlp_endpoint', None)

    if otlp_endpoint:
        otlp_exporter = OTLPSpanExporter(
            endpoint=f"{otlp_endpoint}/v1/traces",
            headers={
                "x-datadog-api-key": getattr(settings, 'datadog_api_key', ''),
            } if 'datadog' in otlp_endpoint else {}
        )

        span_processor = BatchSpanProcessor(otlp_exporter)
        provider.add_span_processor(span_processor)
        logger.info("OpenTelemetry OTLP exporter configured: %s", otlp_endpoint)
    else:
        logger.info("OpenTelemetry running in local mode (no OTLP endpoint)")

    # ── Auto-instrumentation ──────────────────────────────────────────

    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument()
    RedisInstrumentor().instrument()

    # Update global tracer
    global _tracer
    _tracer = trace.get_tracer("ai-communication-coach")

    return provider


# ── Custom tracing utilities ──────────────────────────────────────────────

# Backwards compatibility alias
tracer = None  # Will be set after setup_telemetry()


class _NoOpSpan:
    """No-op span context manager for when tracing is disabled."""
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def set_attribute(self, key, value):
        pass


class _NoOpContextManager:
    """Returns a no-op span."""
    def __init__(self, name):
        self.name = name
    def __enter__(self):
        return _NoOpSpan()
    def __exit__(self, *args):
        pass


def trace_span(name: str, attributes: dict[str, Any] | None = None):
    """Decorator to add tracing to async functions with optional attributes."""
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            t = _get_tracer()
            if t is None:
                return await func(*args, **kwargs)
            with t.start_as_current_span(name) as span:
                if attributes:
                    for key, value in attributes.items():
                        span.set_attribute(key, value)
                start = time.monotonic()
                try:
                    result = await func(*args, **kwargs)
                    elapsed_ms = (time.monotonic() - start) * 1000
                    span.set_attribute("duration_ms", round(elapsed_ms, 2))
                    return result
                except Exception as e:
                    span.set_attribute("error", True)
                    span.set_attribute("error.message", str(e))
                    raise
        return wrapper
    return decorator


def trace_sync_span(name: str, attributes: dict[str, Any] | None = None):
    """Decorator to add tracing to synchronous functions."""
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            t = _get_tracer()
            if t is None:
                return func(*args, **kwargs)
            with t.start_as_current_span(name) as span:
                if attributes:
                    for key, value in attributes.items():
                        span.set_attribute(key, value)
                start = time.monotonic()
                try:
                    result = func(*args, **kwargs)
                    elapsed_ms = (time.monotonic() - start) * 1000
                    span.set_attribute("duration_ms", round(elapsed_ms, 2))
                    return result
                except Exception as e:
                    span.set_attribute("error", True)
                    span.set_attribute("error.message", str(e))
                    raise
        return wrapper
    return decorator
