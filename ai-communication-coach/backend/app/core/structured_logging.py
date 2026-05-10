"""Structured logging and request tracing for production observability.

Provides:
- JSON structured logs for log aggregation
- Request ID propagation for distributed tracing
- Performance timing for critical operations
- Correlation IDs for debugging across services
"""

import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Context variables for request tracing
request_id_var: ContextVar[str] = ContextVar('request_id', default='')
correlation_id_var: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)


class StructuredLogFormatter(logging.Formatter):
    """JSON formatter for structured logging.
    
    Output format compatible with ELK Stack, Datadog, and other log aggregators.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'request_id': request_id_var.get(),
            'correlation_id': correlation_id_var.get(),
        }
        
        # Add file location for debugging
        log_data['source'] = {
            'file': record.pathname,
            'line': record.lineno,
            'function': record.funcName
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields from record
        for key, value in record.__dict__.items():
            if key not in {
                'name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
                'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                'thread', 'threadName', 'processName', 'process', 'getMessage',
                'request_id', 'correlation_id'
            }:
                if not key.startswith('_'):
                    log_data[key] = value
        
        return json.dumps(log_data, default=str)


class RequestTracingMiddleware(BaseHTTPMiddleware):
    """Middleware to add request tracing and structured logging.
    
    Features:
    - Generates/request ID from header or creates new one
    - Logs all requests with timing
    - Adds request ID to response headers
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.logger = logging.getLogger('api.requests')
    
    async def dispatch(self, request: Request, call_next):
        # Get or generate request ID
        request_id = request.headers.get('X-Request-ID')
        if not request_id:
            request_id = str(uuid.uuid4())
        
        # Get correlation ID from header (for distributed tracing)
        correlation_id = request.headers.get('X-Correlation-ID')
        
        # Set context variables
        request_id_var.set(request_id)
        correlation_id_var.set(correlation_id)
        
        # Start timing
        start_time = time.time()
        
        # Log request
        self.logger.info(
            f"{request.method} {request.url.path} - Started",
            extra={
                'http_method': request.method,
                'http_path': request.url.path,
                'http_query': str(request.query_params),
                'client_ip': request.client.host if request.client else None,
                'user_agent': request.headers.get('user-agent'),
            }
        )
        
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log response
            self.logger.info(
                f"{request.method} {request.url.path} - Completed",
                extra={
                    'http_method': request.method,
                    'http_path': request.url.path,
                    'http_status': response.status_code,
                    'duration_ms': round(duration_ms, 2),
                }
            )
            
            # Add request ID to response headers
            response.headers['X-Request-ID'] = request_id
            if correlation_id:
                response.headers['X-Correlation-ID'] = correlation_id
            
            return response
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            
            self.logger.error(
                f"{request.method} {request.url.path} - Failed",
                extra={
                    'http_method': request.method,
                    'http_path': request.url.path,
                    'duration_ms': round(duration_ms, 2),
                    'error_type': type(e).__name__,
                    'error_message': str(e),
                },
                exc_info=True
            )
            raise


def get_request_id() -> str:
    """Get the current request ID from context."""
    return request_id_var.get()


def get_correlation_id() -> Optional[str]:
    """Get the current correlation ID from context."""
    return correlation_id_var.get()


def timed_execution(operation_name: str, logger_name: Optional[str] = None):
    """Decorator to time and log function execution.
    
    Usage:
        @timed_execution("ai_analysis")
        async def analyze_transcript(transcript: str):
            # ...
            pass
    """
    def decorator(func):
        logger = logging.getLogger(logger_name or func.__module__)
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                logger.info(
                    f"{operation_name} completed",
                    extra={
                        'operation': operation_name,
                        'duration_ms': round(duration_ms, 2),
                        'status': 'success',
                    }
                )
                return result
                
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                
                logger.error(
                    f"{operation_name} failed",
                    extra={
                        'operation': operation_name,
                        'duration_ms': round(duration_ms, 2),
                        'status': 'error',
                        'error_type': type(e).__name__,
                    },
                    exc_info=True
                )
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                logger.info(
                    f"{operation_name} completed",
                    extra={
                        'operation': operation_name,
                        'duration_ms': round(duration_ms, 2),
                        'status': 'success',
                    }
                )
                return result
                
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                
                logger.error(
                    f"{operation_name} failed",
                    extra={
                        'operation': operation_name,
                        'duration_ms': round(duration_ms, 2),
                        'status': 'error',
                        'error_type': type(e).__name__,
                    },
                    exc_info=True
                )
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


import asyncio


def setup_structured_logging(log_level: str = "INFO"):
    """Setup structured JSON logging for the application.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
    """
    # Create formatter
    formatter = StructuredLogFormatter()
    
    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Console handler with structured format
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(getattr(logging, log_level.upper()))
    
    # Clear existing handlers and add new one
    root_logger.handlers = []
    root_logger.addHandler(console_handler)
    
    # Reduce noise from third-party libraries
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    
    root_logger.info("Structured logging initialized", extra={'log_level': log_level})


class PerformanceTimer:
    """Context manager for timing operations.
    
    Usage:
        with PerformanceTimer("database_query"):
            result = await session.execute(query)
    """
    
    def __init__(self, operation_name: str, logger_name: Optional[str] = None):
        self.operation_name = operation_name
        self.logger = logging.getLogger(logger_name or 'performance')
        self.start_time = None
        self.duration_ms = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.duration_ms = (time.time() - self.start_time) * 1000
        
        if exc_type:
            self.logger.warning(
                f"{self.operation_name} failed after {self.duration_ms:.2f}ms",
                extra={
                    'operation': self.operation_name,
                    'duration_ms': round(self.duration_ms, 2),
                    'error_type': exc_type.__name__,
                }
            )
        else:
            self.logger.info(
                f"{self.operation_name} completed in {self.duration_ms:.2f}ms",
                extra={
                    'operation': self.operation_name,
                    'duration_ms': round(self.duration_ms, 2),
                }
            )
    
    async def __aenter__(self):
        self.start_time = time.time()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.__exit__(exc_type, exc_val, exc_tb)
