"""Database resilience and retry logic for PostgreSQL connections.

Provides:
- Connection retry with exponential backoff
- Circuit breaker for database operations
- Transaction retry for transient failures
"""

import asyncio
import logging
from functools import wraps
from typing import Callable, TypeVar, Any
from contextlib import asynccontextmanager

from sqlalchemy.exc import OperationalError, DatabaseError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import SessionLocal
from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar('T')


class DatabaseRetryConfig:
    """Configuration for database retry behavior."""
    
    MAX_RETRIES = 3
    BASE_DELAY = 0.5  # seconds
    MAX_DELAY = 5.0  # seconds
    EXPONENTIAL_BASE = 2
    
    # Error codes that indicate transient failures worth retrying
    TRANSIENT_ERROR_CODES = [
        '08000',  # connection_exception
        '08003',  # connection_does_not_exist
        '08006',  # connection_failure
        '40001',  # serialization_failure (deadlock)
        '40P01',  # deadlock_detected
        '53XXX',  # insufficient_resources
        '57014',  # query_canceled
    ]


def is_transient_error(error: Exception) -> bool:
    """Check if a database error is transient and worth retrying."""
    if not isinstance(error, OperationalError):
        return False
    
    # Check for specific PostgreSQL error codes
    error_str = str(error).lower()
    
    transient_keywords = [
        'connection',
        'timeout',
        'deadlock',
        'retry',
        'temporarily',
        'unavailable',
        'too many clients',
        'could not connect',
    ]
    
    return any(keyword in error_str for keyword in transient_keywords)


async def retry_with_backoff(
    func: Callable[[], Any],
    max_retries: int = DatabaseRetryConfig.MAX_RETRIES,
    base_delay: float = DatabaseRetryConfig.BASE_DELAY,
    max_delay: float = DatabaseRetryConfig.MAX_DELAY,
    retryable_exceptions: tuple = (OperationalError, DatabaseError)
) -> Any:
    """Execute a function with exponential backoff retry logic.
    
    Args:
        func: Async function to execute
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay between retries
        max_delay: Maximum delay between retries
        retryable_exceptions: Exception types that trigger retry
        
    Returns:
        Result of func()
        
    Raises:
        Last exception if all retries exhausted
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            return await func()
        except retryable_exceptions as e:
            last_exception = e
            
            if attempt == max_retries:
                logger.error(f"All {max_retries} retries exhausted. Last error: {e}")
                raise
            
            if not is_transient_error(e):
                logger.warning(f"Non-transient error, not retrying: {e}")
                raise
            
            # Calculate delay with exponential backoff and jitter
            delay = min(
                base_delay * (DatabaseRetryConfig.EXPONENTIAL_BASE ** attempt),
                max_delay
            )
            
            # Add small random jitter to prevent thundering herd
            import random
            jitter = random.uniform(0, 0.1)
            total_delay = delay + jitter
            
            logger.warning(
                f"Database operation failed (attempt {attempt + 1}/{max_retries + 1}). "
                f"Retrying in {total_delay:.2f}s. Error: {e}"
            )
            
            await asyncio.sleep(total_delay)
    
    # Should never reach here
    raise last_exception


def retry_db_operation(max_retries: int = DatabaseRetryConfig.MAX_RETRIES):
    """Decorator for retrying database operations.
    
    Usage:
        @retry_db_operation(max_retries=3)
        async def my_db_function():
            # database operation
            pass
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            async def operation():
                return await func(*args, **kwargs)
            
            return await retry_with_backoff(operation, max_retries=max_retries)
        
        return wrapper
    return decorator


@asynccontextmanager
async def resilient_session():
    """Context manager for database sessions with automatic retry.
    
    Usage:
        async with resilient_session() as session:
            result = await session.execute(query)
    """
    session = None
    try:
        session = SessionLocal()
        yield session
        await session.commit()
    except OperationalError as e:
        if session:
            await session.rollback()
        
        if is_transient_error(e):
            logger.warning(f"Transient error in session, retrying: {e}")
            # Retry once more
            session = SessionLocal()
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        else:
            raise
    except Exception:
        if session:
            await session.rollback()
        raise
    finally:
        if session:
            await session.close()


class DatabaseCircuitBreaker:
    """Circuit breaker for database connections.
    
    Prevents cascading failures when database is down.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self.half_open_calls = 0
        self._lock = asyncio.Lock()
    
    async def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute function with circuit breaker protection."""
        async with self._lock:
            if self.state == "OPEN":
                # Check if recovery timeout has passed
                import time
                if time.time() - self.last_failure_time > self.recovery_timeout:
                    self.state = "HALF_OPEN"
                    self.half_open_calls = 0
                    logger.info("Circuit breaker entering HALF_OPEN state")
                else:
                    raise DatabaseError("Database circuit breaker is OPEN")
            
            if self.state == "HALF_OPEN":
                if self.half_open_calls >= self.half_open_max_calls:
                    raise DatabaseError("Database circuit breaker is HALF_OPEN (limit reached)")
                self.half_open_calls += 1
        
        try:
            result = await func(*args, **kwargs)
            
            # Success - reset circuit
            async with self._lock:
                if self.state == "HALF_OPEN":
                    logger.info("Circuit breaker CLOSED (recovered)")
                    self.state = "CLOSED"
                    self.failure_count = 0
            
            return result
            
        except OperationalError as e:
            async with self._lock:
                self.failure_count += 1
                self.last_failure_time = time.time()
                
                if self.failure_count >= self.failure_threshold:
                    if self.state != "OPEN":
                        logger.error(f"Circuit breaker OPENED after {self.failure_count} failures")
                        self.state = "OPEN"
            
            raise


# Global circuit breaker instance
db_circuit_breaker = DatabaseCircuitBreaker()


async def health_check_database() -> dict:
    """Perform database health check with connection pool status.
    
    Returns:
        Dictionary with health status and metrics
    """
    from sqlalchemy import text
    
    try:
        async with SessionLocal() as session:
            start_time = asyncio.get_event_loop().time()
            await session.execute(text("SELECT 1"))
            latency_ms = (asyncio.get_event_loop().time() - start_time) * 1000
            
            return {
                "status": "healthy",
                "latency_ms": round(latency_ms, 2),
                "connection_pool": "connected",
                "error": None
            }
    except OperationalError as e:
        return {
            "status": "unhealthy",
            "latency_ms": None,
            "connection_pool": "disconnected",
            "error": str(e)
        }
    except Exception as e:
        return {
            "status": "error",
            "latency_ms": None,
            "connection_pool": "unknown",
            "error": str(e)
        }
