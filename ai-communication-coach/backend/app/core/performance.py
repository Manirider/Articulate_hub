"""Performance monitoring and optimization utilities."""
import time
import functools
from typing import Callable, Any
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Monitor API and database performance."""
    
    def __init__(self):
        self.metrics = {
            'api_calls': {},
            'db_queries': {},
            'ai_pipeline': {}
        }
    
    def log_api_call(self, endpoint: str, duration_ms: float, status_code: int):
        """Log API call metrics."""
        if endpoint not in self.metrics['api_calls']:
            self.metrics['api_calls'][endpoint] = {
                'count': 0,
                'total_duration': 0,
                'avg_duration': 0,
                'errors': 0
            }
        
        metric = self.metrics['api_calls'][endpoint]
        metric['count'] += 1
        metric['total_duration'] += duration_ms
        metric['avg_duration'] = metric['total_duration'] / metric['count']
        
        if status_code >= 400:
            metric['errors'] += 1
        
        # Log slow requests (>500ms)
        if duration_ms > 500:
            logger.warning(f"Slow API call: {endpoint} took {duration_ms:.2f}ms")
    
    def log_db_query(self, query_name: str, duration_ms: float):
        """Log database query metrics."""
        if query_name not in self.metrics['db_queries']:
            self.metrics['db_queries'][query_name] = {
                'count': 0,
                'total_duration': 0,
                'avg_duration': 0
            }
        
        metric = self.metrics['db_queries'][query_name]
        metric['count'] += 1
        metric['total_duration'] += duration_ms
        metric['avg_duration'] = metric['total_duration'] / metric['count']
        
        # Log slow queries (>100ms)
        if duration_ms > 100:
            logger.warning(f"Slow DB query: {query_name} took {duration_ms:.2f}ms")
    
    def get_report(self) -> dict:
        """Generate performance report."""
        return {
            'api_summary': {
                endpoint: {
                    'count': m['count'],
                    'avg_duration_ms': round(m['avg_duration'], 2),
                    'error_rate': round(m['errors'] / m['count'] * 100, 2) if m['count'] > 0 else 0
                }
                for endpoint, m in self.metrics['api_calls'].items()
            },
            'db_summary': {
                query: {
                    'count': m['count'],
                    'avg_duration_ms': round(m['avg_duration'], 2)
                }
                for query, m in self.metrics['db_queries'].items()
            }
        }


# Global instance
monitor = PerformanceMonitor()


def timed(func: Callable) -> Callable:
    """Decorator to time function execution."""
    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs):
        start = time.time()
        try:
            return await func(*args, **kwargs)
        finally:
            duration = (time.time() - start) * 1000
            logger.debug(f"{func.__name__} took {duration:.2f}ms")
    
    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs):
        start = time.time()
        try:
            return func(*args, **kwargs)
        finally:
            duration = (time.time() - start) * 1000
            logger.debug(f"{func.__name__} took {duration:.2f}ms")
    
    return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper


@asynccontextmanager
async def timed_query(query_name: str):
    """Context manager for timing database queries."""
    start = time.time()
    try:
        yield
    finally:
        duration = (time.time() - start) * 1000
        monitor.log_db_query(query_name, duration)


import asyncio
