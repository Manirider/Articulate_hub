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

    cors_origins: List[str] = ["http://localhost:3000"]
    openai_api_key: str = ""
    whisper_model: str = "tiny"

    upload_dir: str = "uploads"
    recordings_dir: str = "recordings"
    rate_limit_per_minute: int = 120

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
