"""Tests for auth routes (app/api/v1/routes/auth.py).

Tests authentication flows including signup, login, OAuth helpers, and token refresh.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_signup_success(client):
    """Test successful user signup."""
    response = await client.post("/api/v1/auth/signup", json={
        "email": "newuser@example.com",
        "password": "SecurePass123!",
        "full_name": "Test User"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_signup_duplicate_email(client):
    """Test that duplicate email returns 409."""
    payload = {
        "email": "duplicate@example.com",
        "password": "SecurePass123!",
        "full_name": "Test User"
    }
    await client.post("/api/v1/auth/signup", json=payload)
    response = await client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client):
    """Test successful login after signup."""
    await client.post("/api/v1/auth/signup", json={
        "email": "loginuser@example.com",
        "password": "SecurePass123!",
        "full_name": "Login User"
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "loginuser@example.com",
        "password": "SecurePass123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_email(client):
    """Test login with non-existent email."""
    response = await client.post("/api/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "SomePass123!"
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """Test login with wrong password."""
    await client.post("/api/v1/auth/signup", json={
        "email": "wrongpass@example.com",
        "password": "CorrectPass123!",
        "full_name": "Test User"
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "WrongPass123!"
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    """Test /me without token returns 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_me_authenticated(client):
    """Test /me with valid token returns user data."""
    signup_response = await client.post("/api/v1/auth/signup", json={
        "email": "meuser@example.com",
        "password": "SecurePass123!",
        "full_name": "Me User"
    })
    token = signup_response.json()["access_token"]
    response = await client.get("/api/v1/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "meuser@example.com"
    assert data["full_name"] == "Me User"


@pytest.mark.asyncio
async def test_refresh_token(client):
    """Test token refresh for authenticated user."""
    signup_response = await client.post("/api/v1/auth/signup", json={
        "email": "refreshuser@example.com",
        "password": "SecurePass123!",
        "full_name": "Refresh User"
    })
    token = signup_response.json()["access_token"]
    response = await client.post("/api/v1/auth/refresh", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_refresh_token_unauthenticated(client):
    """Test token refresh without auth returns error."""
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_forgot_password(client):
    """Test forgot password always returns success message (security best practice)."""
    response = await client.post("/api/v1/auth/forgot-password", json={
        "email": "nonexistent@example.com"
    })
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_forgot_password_existing_user(client):
    """Test forgot password for an existing user."""
    await client.post("/api/v1/auth/signup", json={
        "email": "forgotuser@example.com",
        "password": "SecurePass123!",
        "full_name": "Forgot User"
    })
    with patch("app.api.v1.routes.auth.send_password_reset_email", new_callable=AsyncMock) as mock_email:
        mock_email.return_value = True
        response = await client.post("/api/v1/auth/forgot-password", json={
            "email": "forgotuser@example.com"
        })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client):
    """Test reset password with invalid/expired token returns 400."""
    response = await client.post("/api/v1/auth/reset-password", json={
        "token": "this_is_a_long_enough_invalid_token_string_for_validation",
        "new_password": "NewSecurePass123!"
    })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_github_start_not_configured(client):
    """Test GitHub OAuth start when not configured returns 503."""
    response = await client.get("/api/v1/auth/github/start", follow_redirects=False)
    assert response.status_code == 503


@pytest.mark.asyncio
async def test_github_callback_no_code(client):
    """Test GitHub callback without code returns error."""
    response = await client.get("/api/v1/auth/github/callback")
    # Should be 503 (not configured) or 400 (invalid state)
    assert response.status_code in (400, 503)


# Test helper functions
from app.api.v1.routes.auth import _github_oauth_enabled, _github_auth_url


def test_github_oauth_not_enabled():
    """Test GitHub OAuth detection when not configured."""
    with patch("app.api.v1.routes.auth.settings") as mock_settings:
        mock_settings.github_client_id = ""
        mock_settings.github_client_secret = ""
        mock_settings.github_redirect_uri = ""
        mock_settings.frontend_url = ""
        assert _github_oauth_enabled() is False


def test_github_oauth_enabled():
    """Test GitHub OAuth detection when configured."""
    with patch("app.api.v1.routes.auth.settings") as mock_settings:
        mock_settings.github_client_id = "real_id"
        mock_settings.github_client_secret = "real_secret"
        mock_settings.github_redirect_uri = "http://localhost/callback"
        mock_settings.frontend_url = "http://localhost:3000"
        assert _github_oauth_enabled() is True


def test_github_oauth_partial_config():
    """Test GitHub OAuth returns False with partial config."""
    with patch("app.api.v1.routes.auth.settings") as mock_settings:
        mock_settings.github_client_id = "real_id"
        mock_settings.github_client_secret = "YOUR_SECRET"
        mock_settings.github_redirect_uri = "http://localhost/callback"
        mock_settings.frontend_url = "http://localhost:3000"
        assert _github_oauth_enabled() is False


def test_github_auth_url():
    """Test GitHub auth URL generation."""
    with patch("app.api.v1.routes.auth.settings") as mock_settings:
        mock_settings.github_client_id = "test_client"
        mock_settings.github_redirect_uri = "http://localhost/callback"
        url = _github_auth_url("test_state")
        assert "github.com/login/oauth/authorize" in url
        assert "test_client" in url
        assert "test_state" in url
