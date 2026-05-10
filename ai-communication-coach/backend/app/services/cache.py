"""Redis-backed caching service for AI Communication Coach.

Provides caching for:
- Session transcripts
- AI-generated content
- User analytics
- Room state
"""

import json
import pickle
from typing import Any, Optional
from datetime import timedelta

from app.core.redis import get_redis


class CacheService:
    """Redis-backed caching service with serialization support."""
    
    # Cache key prefixes for different data types
    SESSION_PREFIX = "session:"
    TRANSCRIPT_PREFIX = "transcript:"
    AI_RESPONSE_PREFIX = "ai:"
    ANALYTICS_PREFIX = "analytics:"
    ROOM_PREFIX = "room:"
    USER_PREFIX = "user:"
    
    # Default TTL values
    DEFAULT_TTL = timedelta(hours=1)
    SESSION_TTL = timedelta(hours=24)
    AI_TTL = timedelta(hours=6)
    ANALYTICS_TTL = timedelta(minutes=15)
    ROOM_TTL = timedelta(minutes=30)
    
    @staticmethod
    async def get(key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            redis = await get_redis()
            value = await redis.get(key)
            if value is None:
                return None
            
            # Try pickle first (for complex objects), then JSON
            try:
                return pickle.loads(value)
            except:
                try:
                    return json.loads(value)
                except:
                    return value.decode('utf-8')
        except Exception as e:
            # Log error but don't fail - cache is best-effort
            print(f"Cache get error for key {key}: {e}")
            return None
    
    @staticmethod
    async def set(
        key: str, 
        value: Any, 
        ttl: Optional[timedelta] = None,
        use_pickle: bool = False
    ) -> bool:
        """Set value in cache with optional TTL."""
        try:
            redis = await get_redis()
            
            # Serialize value
            if use_pickle:
                serialized = pickle.dumps(value)
            else:
                if isinstance(value, (dict, list)):
                    serialized = json.dumps(value)
                else:
                    serialized = str(value)
            
            # Set with TTL
            if ttl:
                await redis.setex(key, int(ttl.total_seconds()), serialized)
            else:
                await redis.set(key, serialized)
            
            return True
        except Exception as e:
            print(f"Cache set error for key {key}: {e}")
            return False
    
    @staticmethod
    async def delete(key: str) -> bool:
        """Delete value from cache."""
        try:
            redis = await get_redis()
            await redis.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error for key {key}: {e}")
            return False
    
    @staticmethod
    async def exists(key: str) -> bool:
        """Check if key exists in cache."""
        try:
            redis = await get_redis()
            return await redis.exists(key) > 0
        except Exception:
            return False
    
    # Session-specific methods
    @classmethod
    async def get_session_transcript(cls, session_id: str) -> Optional[list]:
        """Get cached transcript chunks for a session."""
        key = f"{cls.TRANSCRIPT_PREFIX}{session_id}"
        return await cls.get(key)
    
    @classmethod
    async def add_to_session_transcript(
        cls, 
        session_id: str, 
        chunk: dict,
        ttl: Optional[timedelta] = None
    ) -> bool:
        """Add a transcript chunk to cached session transcript."""
        key = f"{cls.TRANSCRIPT_PREFIX}{session_id}"
        
        # Get existing chunks
        existing = await cls.get(key)
        if existing is None:
            existing = []
        
        # Add new chunk
        existing.append(chunk)
        
        # Save back
        return await cls.set(
            key, 
            existing, 
            ttl or cls.SESSION_TTL,
            use_pickle=True
        )
    
    @classmethod
    async def invalidate_session(cls, session_id: str) -> bool:
        """Invalidate all cached data for a session."""
        keys = [
            f"{cls.SESSION_PREFIX}{session_id}",
            f"{cls.TRANSCRIPT_PREFIX}{session_id}",
        ]
        
        try:
            redis = await get_redis()
            await redis.delete(*keys)
            return True
        except Exception as e:
            print(f"Error invalidating session {session_id}: {e}")
            return False
    
    # AI response caching
    @classmethod
    async def get_ai_response(cls, cache_key: str) -> Optional[Any]:
        """Get cached AI response."""
        key = f"{cls.AI_RESPONSE_PREFIX}{cache_key}"
        return await cls.get(key)
    
    @classmethod
    async def set_ai_response(
        cls, 
        cache_key: str, 
        response: Any,
        ttl: Optional[timedelta] = None
    ) -> bool:
        """Cache AI response."""
        key = f"{cls.AI_RESPONSE_PREFIX}{cache_key}"
        return await cls.set(key, response, ttl or cls.AI_TTL, use_pickle=True)
    
    # Analytics caching
    @classmethod
    async def get_user_analytics(cls, user_id: str) -> Optional[dict]:
        """Get cached user analytics."""
        key = f"{cls.ANALYTICS_PREFIX}user:{user_id}"
        return await cls.get(key)
    
    @classmethod
    async def set_user_analytics(
        cls, 
        user_id: str, 
        analytics: dict,
        ttl: Optional[timedelta] = None
    ) -> bool:
        """Cache user analytics."""
        key = f"{cls.ANALYTICS_PREFIX}user:{user_id}"
        return await cls.set(key, analytics, ttl or cls.ANALYTICS_TTL)
    
    # Room state caching
    @classmethod
    async def get_room_state(cls, room_id: str) -> Optional[dict]:
        """Get cached room state."""
        key = f"{cls.ROOM_PREFIX}{room_id}"
        return await cls.get(key)
    
    @classmethod
    async def set_room_state(
        cls, 
        room_id: str, 
        state: dict,
        ttl: Optional[timedelta] = None
    ) -> bool:
        """Cache room state."""
        key = f"{cls.ROOM_PREFIX}{room_id}"
        return await cls.set(key, state, ttl or cls.ROOM_TTL, use_pickle=True)
    
    # General cache management
    @staticmethod
    async def clear_pattern(pattern: str) -> int:
        """Clear all keys matching pattern. Returns number of keys deleted."""
        try:
            redis = await get_redis()
            keys = await redis.keys(pattern)
            if keys:
                return await redis.delete(*keys)
            return 0
        except Exception as e:
            print(f"Error clearing cache pattern {pattern}: {e}")
            return 0
    
    @staticmethod
    async def get_cache_stats() -> dict:
        """Get cache statistics."""
        try:
            redis = await get_redis()
            info = await redis.info()
            return {
                "used_memory_human": info.get("used_memory_human", "unknown"),
                "connected_clients": info.get("connected_clients", 0),
                "total_keys": await redis.dbsize(),
                "hit_rate": info.get("keyspace_hits", 0) / max(
                    info.get("keyspace_hits", 0) + info.get("keyspace_misses", 1), 1
                ),
            }
        except Exception as e:
            return {"error": str(e)}


# Global cache service instance
cache_service = CacheService()
