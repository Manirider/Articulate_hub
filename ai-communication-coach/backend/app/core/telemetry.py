"""OpenTelemetry distributed tracing configuration."""
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION, DEPLOYMENT_ENVIRONMENT

from app.core.config import settings


def setup_telemetry(app):
    """Configure OpenTelemetry for distributed tracing."""
    
    # Resource configuration
    resource = Resource.create({
        SERVICE_NAME: "ai-communication-coach",
        SERVICE_VERSION: "2.0.0",
        DEPLOYMENT_ENVIRONMENT: settings.environment,
    })
    
    # Tracer provider
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
    
    # Instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)
    
    # Instrument SQLAlchemy
    SQLAlchemyInstrumentor().instrument()
    
    # Instrument Redis
    RedisInstrumentor().instrument()
    
    return provider


# Tracer for custom spans
tracer = trace.get_tracer("ai-communication-coach")


def trace_span(name: str):
    """Decorator to add tracing to functions."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            with tracer.start_as_current_span(name):
                return await func(*args, **kwargs)
        return wrapper
    return decorator
