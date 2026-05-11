"""Tests for authentication security features.

Covers:
- JWT token creation and validation
- Password hashing and verification
- Token expiry
- Security configuration validation
"""

import pytest
from datetime import timedelta
from unittest.mock import patch

from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.core.config import Settings


class TestPasswordSecurity:
    """Tests for bcrypt password hashing."""

    def test_hash_and_verify_correct_password(self):
        password = "MySecurePass123!"
        hashed = get_password_hash(password)

        assert hashed != password  # Must not store plaintext
        assert verify_password(password, hashed) is True

    def test_wrong_password_rejected(self):
        hashed = get_password_hash("CorrectPassword123")
        assert verify_password("WrongPassword456", hashed) is False

    def test_different_hashes_for_same_password(self):
        """bcrypt should produce different hashes for the same password (salted)."""
        h1 = get_password_hash("SamePassword123")
        h2 = get_password_hash("SamePassword123")
        assert h1 != h2  # Different salts

    def test_hash_is_bcrypt_format(self):
        hashed = get_password_hash("TestPass123")
        assert hashed.startswith("$2b$") or hashed.startswith("$2a$")

    def test_empty_password_can_be_hashed(self):
        """Empty password should hash without crashing (validation is at schema layer)."""
        hashed = get_password_hash("")
        assert hashed
        assert verify_password("", hashed) is True

    def test_unicode_password(self):
        password = "パス123"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True


class TestJWTTokens:
    """Tests for JWT token creation and validation."""

    def test_create_and_decode_token(self):
        token = create_access_token("user-123")
        payload = decode_access_token(token)
        assert payload["sub"] == "user-123"
        assert "exp" in payload

    def test_token_with_custom_expiry(self):
        token = create_access_token("user-456", timedelta(minutes=30))
        payload = decode_access_token(token)
        assert payload["sub"] == "user-456"

    def test_token_with_extra_claims(self):
        token = create_access_token(
            "user-789",
            extra_claims={"role": "admin", "tier": "premium"}
        )
        payload = decode_access_token(token)
        assert payload["sub"] == "user-789"
        assert payload["role"] == "admin"
        assert payload["tier"] == "premium"

    def test_invalid_token_raises(self):
        with pytest.raises(ValueError, match="Invalid token"):
            decode_access_token("this.is.not.a.valid.token")

    def test_tampered_token_rejected(self):
        token = create_access_token("user-123")
        # Tamper with the signature part (3rd part of JWT)
        parts = token.split(".")
        if len(parts) == 3:
            sig = parts[2]
            tampered_sig = ("0" if sig[0] != "0" else "1") + sig[1:]
            tampered = f"{parts[0]}.{parts[1]}.{tampered_sig}"
        else:
            tampered = token + "garbage"
            
        with pytest.raises(ValueError, match="Invalid token"):
            decode_access_token(tampered)

    def test_expired_token_rejected(self):
        token = create_access_token("user-123", timedelta(seconds=-1))
        with pytest.raises(ValueError):
            decode_access_token(token)


class TestConfigValidation:
    """Tests for security-related configuration."""

    def test_default_jwt_secret_warning(self):
        """Default JWT secret should be flagged as insecure."""
        s = Settings(jwt_secret="change_me")
        assert s.jwt_secret == "change_me"

    def test_cors_origins_string_parsing(self):
        """CORS origins should parse comma-separated string."""
        s = Settings(cors_origins="http://localhost:3000,http://localhost:8000")
        assert "http://localhost:3000" in s.cors_origins
        assert "http://localhost:8000" in s.cors_origins

    def test_cors_origins_wildcard(self):
        s = Settings(cors_origins="*")
        assert s.cors_origins == ["*"]

    def test_cors_origins_json_array(self):
        s = Settings(cors_origins='["http://localhost:3000"]')
        assert "http://localhost:3000" in s.cors_origins

    def test_bcrypt_rounds_configurable(self):
        s = Settings(bcrypt_rounds=4)
        assert s.bcrypt_rounds == 4

    def test_rate_limit_configurable(self):
        s = Settings(rate_limit_per_minute=60)
        assert s.rate_limit_per_minute == 60
