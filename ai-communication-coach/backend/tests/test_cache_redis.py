"""Tests for Redis caching and rate limiting services.

Tests Redis operations with mocked client to verify:
- Cache get/set/delete/exists operations
- Rate limiter allow/deny logic
- Redis client lifecycle management
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.core.redis import RedisCache, RateLimiter, get_redis, close_redis


class TestRedisCache:
    """Tests for RedisCache wrapper."""

    @pytest.mark.asyncio
    async def test_cache_get_returns_value(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = '{"key": "value"}'
        cache = RedisCache(mock_redis)

        result = await cache.get("test_key")
        assert result == '{"key": "value"}'
        mock_redis.get.assert_awaited_once_with("test_key")

    @pytest.mark.asyncio
    async def test_cache_get_returns_none_for_missing(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        cache = RedisCache(mock_redis)

        result = await cache.get("missing_key")
        assert result is None

    @pytest.mark.asyncio
    async def test_cache_set_with_default_expiry(self):
        mock_redis = AsyncMock()
        cache = RedisCache(mock_redis)

        await cache.set("key", "value")
        mock_redis.set.assert_awaited_once_with("key", "value", ex=300)

    @pytest.mark.asyncio
    async def test_cache_set_with_custom_expiry(self):
        mock_redis = AsyncMock()
        cache = RedisCache(mock_redis)

        await cache.set("key", "value", expire=600)
        mock_redis.set.assert_awaited_once_with("key", "value", ex=600)

    @pytest.mark.asyncio
    async def test_cache_delete(self):
        mock_redis = AsyncMock()
        cache = RedisCache(mock_redis)

        await cache.delete("key")
        mock_redis.delete.assert_awaited_once_with("key")

    @pytest.mark.asyncio
    async def test_cache_exists_true(self):
        mock_redis = AsyncMock()
        mock_redis.exists.return_value = 1
        cache = RedisCache(mock_redis)

        assert await cache.exists("key") is True

    @pytest.mark.asyncio
    async def test_cache_exists_false(self):
        mock_redis = AsyncMock()
        mock_redis.exists.return_value = 0
        cache = RedisCache(mock_redis)

        assert await cache.exists("key") is False


class TestRateLimiter:
    """Tests for Redis-based rate limiting."""

    @pytest.mark.asyncio
    async def test_first_request_always_allowed(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        limiter = RateLimiter(mock_redis)

        result = await limiter.is_allowed("client:1", max_requests=10, window=60)
        assert result is True
        mock_redis.set.assert_awaited_once_with("client:1", 1, ex=60)

    @pytest.mark.asyncio
    async def test_under_limit_allowed(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = "5"
        limiter = RateLimiter(mock_redis)

        result = await limiter.is_allowed("client:1", max_requests=10, window=60)
        assert result is True
        mock_redis.incr.assert_awaited_once_with("client:1")

    @pytest.mark.asyncio
    async def test_at_limit_denied(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = "10"
        limiter = RateLimiter(mock_redis)

        result = await limiter.is_allowed("client:1", max_requests=10, window=60)
        assert result is False

    @pytest.mark.asyncio
    async def test_over_limit_denied(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = "100"
        limiter = RateLimiter(mock_redis)

        result = await limiter.is_allowed("client:1", max_requests=10, window=60)
        assert result is False


class TestRedisLifecycle:
    """Tests for Redis client lifecycle management."""

    @pytest.mark.asyncio
    async def test_close_redis_when_client_exists(self):
        import app.core.redis as redis_module
        mock_client = AsyncMock()
        redis_module._redis_client = mock_client

        await close_redis()

        mock_client.close.assert_awaited_once()
        assert redis_module._redis_client is None

    @pytest.mark.asyncio
    async def test_close_redis_when_no_client(self):
        import app.core.redis as redis_module
        redis_module._redis_client = None

        # Should not raise
        await close_redis()
        assert redis_module._redis_client is None
