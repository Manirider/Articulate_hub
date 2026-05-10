"""Rate limiting middleware for authentication endpoints."""
import time
from typing import Dict, Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware


class AuthRateLimiter(BaseHTTPMiddleware):
    """Simple in-memory rate limiter for auth endpoints."""
    
    def __init__(self, app, max_requests: int = 5, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = {}
    
    async def dispatch(self, request: Request, call_next):
        # Only rate limit auth endpoints
        if not request.url.path.startswith("/api/v1/auth"):
            return await call_next(request)
        
        # Skip rate limiting for GET requests (except sensitive ones)
        if request.method == "GET" and request.url.path not in ["/api/v1/auth/me"]:
            return await call_next(request)
        
        # Get client IP
        client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
        if client_ip and "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()
        
        # Create key based on IP and endpoint
        key = f"{client_ip}:{request.url.path}"
        
        now = time.time()
        
        # Clean old requests for this key
        if key in self.requests:
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if now - req_time < self.window_seconds
            ]
        else:
            self.requests[key] = []
        
        # Check rate limit
        if len(self.requests.get(key, [])) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please try again in {self.window_seconds} seconds."
            )
        
        # Record this request
        self.requests.setdefault(key, []).append(now)
        
        return await call_next(request)
