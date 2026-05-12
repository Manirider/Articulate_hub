from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

# Use bcrypt with configurable rounds (default 12 for production)
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.bcrypt_rounds
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash with timing-safe comparison."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash password with bcrypt."""
    return pwd_context.hash(password)


def decode_access_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    """Decode and validate JWT token with type and issuer enforcement."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"require_exp": True},
        )
        # Validate token type
        if payload.get("type") != expected_type:
            raise ValueError(f"Expected token type '{expected_type}', got '{payload.get('type')}'")
        # Validate issuer if present
        if payload.get("iss") and payload["iss"] != settings.token_issuer:
            raise ValueError("Invalid token issuer")
        return payload
    except JWTError:
        raise ValueError("Invalid token")
    except Exception:
        raise ValueError("Invalid token")


def create_access_token(
    subject: str,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Create a short-lived access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)

    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
        "iss": settings.token_issuer,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(
    subject: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a long-lived refresh token for token rotation."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        "iss": settings.token_issuer,
    }

    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
