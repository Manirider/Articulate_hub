import re

from pydantic import BaseModel, EmailStr, Field, field_validator, ValidationInfo


PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{8,128}$")


def validate_password_strength(value: str) -> str:
    """Validate password meets complexity requirements and return normalized value."""
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(value) > 128:
        raise ValueError("Password must not exceed 128 characters")
    if not re.search(r'[a-z]', value):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r'[A-Z]', value):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r'\d', value):
        raise ValueError("Password must contain at least one number")
    if ' ' in value:
        raise ValueError("Password cannot contain spaces")
    return value


class SignUpRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = " ".join(value.split()).strip()
        if len(normalized) < 2:
            raise ValueError("Full name must be at least 2 characters")
        if len(normalized) > 120:
            raise ValueError("Full name must not exceed 120 characters")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Password is required")
        return value


class GoogleLoginRequest(BaseModel):
    token: str = Field(min_length=20)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    xp: int
    level: int
    streak_days: int
