"""APM (Application Performance Monitoring) integration."""
import time
import logging
from typing import Any, Dict, Optional
from functools import wraps

logger = logging.getLogger(__name__)


class APMMetrics:
    """Custom APM metrics collector."""
    
    def __init__(self):
        self.metrics: Dict[str, Any] = {
            'requests': {},
            'errors': {},
            'latency': {},
        }
    
    def record_request(self, endpoint: str, method: str, status_code: int, duration_ms: float):
        """Record API request metrics."""
        key = f"{method} {endpoint}"
        
        if key not in self.metrics['requests']:
            self.metrics['requests'][key] = {
                'count': 0,
                'total_duration': 0,
                'status_codes': {},
            }
        
        req = self.metrics['requests'][key]
        req['count'] += 1
        req['total_duration'] += duration_ms
        req['status_codes'][status_code] = req['status_codes'].get(status_code, 0) + 1
        
        # Log slow requests
        if duration_ms > 1000:
            logger.warning(f"Slow request: {key} took {duration_ms:.2f}ms")
        
        # Log errors
        if status_code >= 400:
            self.record_error(endpoint, status_code)
    
    def record_error(self, endpoint: str, error_code: int, error_type: str = "api"):
        """Record error metrics."""
        key = f"{endpoint}:{error_code}"
        
        if key not in self.metrics['errors']:
            self.metrics['errors'][key] = {
                'count': 0,
                'last_occurrence': None,
            }
        
        err = self.metrics['errors'][key]
        err['count'] += 1
        err['last_occurrence'] = time.time()
    
    def get_dashboard_data(self) -> Dict:
        """Get metrics for dashboard display."""
        total_requests = sum(r['count'] for r in self.metrics['requests'].values())
        total_errors = sum(e['count'] for e in self.metrics['errors'].values())
        
        error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'total_requests': total_requests,
            'total_errors': total_errors,
            'error_rate_percent': round(error_rate, 2),
            'top_endpoints': sorted(
                self.metrics['requests'].items(),
                key=lambda x: x[1]['count'],
                reverse=True
            )[:10],
            'error_breakdown': self.metrics['errors'],
        }


# Global APM instance
apm = APMMetrics()


def track_performance(func):
    """Decorator to track function performance."""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start = time.time()
        try:
            result = await func(*args, **kwargs)
            duration = (time.time() - start) * 1000
            
            # Record metric
            apm.record_request(
                endpoint=func.__name__,
                method='INTERNAL',
                status_code=200,
                duration_ms=duration
            )
            
            return result
        except Exception as e:
            duration = (time.time() - start) * 1000
            apm.record_error(func.__name__, 500, type(e).__name__)
            raise
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start = time.time()
        try:
            result = func(*args, **kwargs)
            duration = (time.time() - start) * 1000
            
            apm.record_request(
                endpoint=func.__name__,
                method='INTERNAL',
                status_code=200,
                duration_ms=duration
            )
            
            return result
        except Exception as e:
            duration = (time.time() - start) * 1000
            apm.record_error(func.__name__, 500, type(e).__name__)
            raise
    
    return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper


import asyncio
