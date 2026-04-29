import time
from collections import defaultdict

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory sliding-window rate limiter.

    Production note: For multi-process deployments, replace with Redis-backed
    rate limiting (e.g., via slowapi). This implementation is correct for
    single-process / local development.
    """

    def __init__(self, app, max_requests_per_minute: int = 120):
        super().__init__(app)
        self.max_requests_per_minute = max_requests_per_minute
        self.bucket: defaultdict[str, list[float]] = defaultdict(list)
        self._cleanup_counter = 0

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        cutoff = now - 60.0

        # Prune expired entries for this IP
        self.bucket[client_ip] = [ts for ts in self.bucket[client_ip] if ts >= cutoff]

        if not self.bucket[client_ip]:
            del self.bucket[client_ip]

        if len(self.bucket[client_ip]) >= self.max_requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded"},
                headers={"Retry-After": "60"},
            )

        self.bucket[client_ip].append(now)

        # Periodic cleanup: every 500 requests, remove stale IPs to prevent memory leak
        self._cleanup_counter += 1
        if self._cleanup_counter >= 500:
            self._cleanup_counter = 0
            stale_ips = [ip for ip, timestamps in list(self.bucket.items()) if not timestamps or timestamps[-1] < cutoff]
            for ip in stale_ips:
                self.bucket.pop(ip, None)

        return await call_next(request)
