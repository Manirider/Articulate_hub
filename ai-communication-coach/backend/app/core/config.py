from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    app_name: str = "AI Communication Coach"
    environment: str = "development"

    database_url: str = "sqlite+aiosqlite:///./local-dev.db"

    jwt_secret: str = "change_me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

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


settings = Settings()
