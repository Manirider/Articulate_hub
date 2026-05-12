import os
import sys
from typing import List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    app_name: str = "AI Communication Coach"
    environment: str = "development"

    # Database - PostgreSQL required for production
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aicoach"
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_pool_timeout: int = 30
    
    # Redis - Required for caching, sessions, and real-time features
    redis_url: str = "redis://localhost:6379/0"
    redis_pool_size: int = 50

    jwt_secret: str = "change_me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    refresh_token_expire_days: int = 7
    token_issuer: str = "ai-communication-coach"

    cors_origins: str | List[str] = ["http://localhost:3000"]
    openai_api_key: str = ""
    gladia_api_key: str = ""
    whisper_model: str = "tiny"

    upload_dir: str = "uploads"
    recordings_dir: str = "recordings"
    rate_limit_per_minute: int = 120

    google_client_id: str = "YOUR_GOOGLE_CLIENT_ID"
    github_client_id: str = "YOUR_GITHUB_CLIENT_ID"
    github_client_secret: str = "YOUR_GITHUB_CLIENT_SECRET"
    github_redirect_uri: str = "http://localhost:8000/api/v1/auth/github/callback"
    frontend_url: str = "http://localhost:3000"
    
    # Email service (Resend)
    resend_api_key: str = "YOUR_RESEND_API_KEY"
    
    # Security
    bcrypt_rounds: int = 12
    max_failed_login_attempts: int = 5
    failed_login_window_minutes: int = 15
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            val_stripped = value.strip()
            if val_stripped == "*":
                return ["*"]
            if val_stripped.startswith("[") and val_stripped.endswith("]"):
                import json
                try:
                    return json.loads(val_stripped)
                except Exception:
                    pass
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def validate_production_secrets(self):
        """Enforce that critical secrets are configured for production."""
        _INSECURE_DEFAULTS = {"", "change_me"}
        if self.environment.lower() == "production":
            # JWT Secret check
            if self.jwt_secret in _INSECURE_DEFAULTS:
                print(
                    "FATAL: jwt_secret is set to an insecure default in production. "
                    "Set the JWT_SECRET environment variable to a strong random value.",
                    file=sys.stderr,
                )
                raise SystemExit(1)

            # Database URL check
            if "localhost" in self.database_url or "postgres:postgres" in self.database_url:
                print(
                    "FATAL: database_url is pointing to localhost or using default credentials in production. "
                    "Set a secure DATABASE_URL.",
                    file=sys.stderr,
                )
                raise SystemExit(1)

            # Redis URL check
            if "localhost" in self.redis_url:
                print(
                    "FATAL: redis_url is pointing to localhost in production. "
                    "Set a secure REDIS_URL.",
                    file=sys.stderr,
                )
                raise SystemExit(1)

            if not self.openai_api_key:
                print(
                    "WARNING: openai_api_key is not set — AI features will be disabled.",
                    file=sys.stderr,
                )
        return self


settings = Settings()
