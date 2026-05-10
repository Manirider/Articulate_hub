"""Structured logging configuration with Sentry integration."""
import logging
import sys
import structlog
from sentry_sdk import init as sentry_init
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration

from app.core.config import settings


def setup_logging():
    """Configure structured JSON logging."""
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )
    
    # Get logger
    return structlog.get_logger()


def setup_sentry():
    """Initialize Sentry for error tracking."""
    sentry_dsn = getattr(settings, 'sentry_dsn', None)
    
    if sentry_dsn and not sentry_dsn.startswith('YOUR_'):
        sentry_init(
            dsn=sentry_dsn,
            environment=settings.environment,
            release="2.0.0",
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
                RedisIntegration(),
            ],
            traces_sample_rate=0.1,  # 10% of requests for performance monitoring
            profiles_sample_rate=0.1,  # 10% for profiling
            send_default_pii=False,  # Don't send personal info
        )
        return True
    return False


# Get configured logger
logger = setup_logging()
