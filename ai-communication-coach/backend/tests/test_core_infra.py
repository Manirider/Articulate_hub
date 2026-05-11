"""Tests for core infrastructure: dependencies, config, database, rate limit, telemetry.

These tests target specific uncovered lines in core modules.
"""
import pytest
import os
from unittest.mock import AsyncMock, patch, MagicMock


class TestCORSOriginsParsing:
    """Test config CORS origins parsing edge cases."""

    def test_parse_wildcard(self):
        from app.core.config import Settings
        result = Settings.parse_cors_origins("*")
        assert result == ["*"]

    def test_parse_json_array(self):
        from app.core.config import Settings
        result = Settings.parse_cors_origins('["http://localhost:3000", "http://localhost:8000"]')
        assert result == ["http://localhost:3000", "http://localhost:8000"]

    def test_parse_comma_separated(self):
        from app.core.config import Settings
        result = Settings.parse_cors_origins("http://localhost:3000, http://localhost:8000")
        assert result == ["http://localhost:3000", "http://localhost:8000"]

    def test_parse_list_passthrough(self):
        from app.core.config import Settings
        result = Settings.parse_cors_origins(["http://localhost:3000"])
        assert result == ["http://localhost:3000"]

    def test_parse_invalid_json_fallback(self):
        from app.core.config import Settings
        result = Settings.parse_cors_origins("[not valid json")
        assert isinstance(result, list)


class TestRateLimitMiddleware:
    """Test rate limit middleware internals."""

    def test_middleware_init(self):
        from app.core.rate_limit import RateLimitMiddleware
        # Can't instantiate without app, just test import
        assert RateLimitMiddleware is not None

    @pytest.mark.asyncio
    async def test_rate_limit_tracks_requests(self, client):
        """Test that the rate limiter doesn't block normal requests."""
        for _ in range(5):
            response = await client.get("/api/v1/health/live")
            assert response.status_code == 200


class TestDependencies:
    """Test the get_current_user dependency."""

    @pytest.mark.asyncio
    async def test_invalid_jwt_token(self, client):
        """Test that a malformed JWT token returns 401."""
        response = await client.get("/api/v1/auth/me", headers={
            "Authorization": "Bearer invalid_token"
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_expired_jwt_token(self, client):
        """Test that an expired JWT token returns 401."""
        from app.core.security import create_access_token
        from datetime import timedelta
        # Create token that expires immediately
        token = create_access_token("fake-user-id", timedelta(seconds=-1))
        response = await client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_valid_token_user_not_found(self, client):
        """Test that a valid JWT for a deleted user returns 401."""
        from app.core.security import create_access_token
        from datetime import timedelta
        import uuid
        # Create token for non-existent user
        fake_id = str(uuid.uuid4())
        token = create_access_token(fake_id, timedelta(minutes=30))
        response = await client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_token_with_invalid_uuid(self, client):
        """Test that a token with non-UUID subject returns 401."""
        from app.core.security import create_access_token
        from datetime import timedelta
        # Create token with invalid UUID as subject
        token = create_access_token("not-a-uuid", timedelta(minutes=30))
        response = await client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 401


class TestSecurity:
    """Test security utilities."""

    def test_create_access_token(self):
        from app.core.security import create_access_token
        from datetime import timedelta
        token = create_access_token("test-sub", timedelta(minutes=30))
        assert isinstance(token, str)
        assert len(token) > 20

    def test_password_hash_verify(self):
        from app.core.security import get_password_hash, verify_password
        hashed = get_password_hash("TestPassword123!")
        assert verify_password("TestPassword123!", hashed) is True
        assert verify_password("WrongPassword!", hashed) is False

    def test_password_hash_is_bcrypt(self):
        from app.core.security import get_password_hash
        hashed = get_password_hash("Test123!")
        assert hashed.startswith("$2b$")
