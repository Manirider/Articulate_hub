"""Redis client for caching, sessions, and real-time features."""
import redis.asyncio as redis
from app.core.config import settings

# Redis client singleton
_redis_client: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    """Get or create Redis client connection."""
    global _redis_client
    
    if _redis_client is None:
        _redis_client = await redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=settings.redis_pool_size,
        )
    
    return _redis_client


async def close_redis():
    """Close Redis connection pool."""
    global _redis_client
    
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


class RedisCache:
    """Redis caching utilities."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    async def get(self, key: str) -> str | None:
        """Get value from cache."""
        return await self.redis.get(key)
    
    async def set(self, key: str, value: str, expire: int = 300):
        """Set value in cache with expiration (default 5 min)."""
        await self.redis.set(key, value, ex=expire)
    
    async def delete(self, key: str):
        """Delete key from cache."""
        await self.redis.delete(key)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        return await self.redis.exists(key) > 0


class RateLimiter:
    """Redis-based rate limiting."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    async def is_allowed(self, key: str, max_requests: int, window: int) -> bool:
        """Check if request is within rate limit."""
        current = await self.redis.get(key)
        
        if current is None:
            await self.redis.set(key, 1, ex=window)
            return True
        
        count = int(current)
        if count >= max_requests:
            return False
        
        await self.redis.incr(key)
        return True
