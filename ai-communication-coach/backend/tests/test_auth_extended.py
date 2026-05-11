"""Extended auth route tests for OAuth flows and password helpers.

These tests use unit-level mocking to exercise OAuth and password reset
code paths that cannot be easily tested via integration tests.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta

from app.api.v1.routes.auth import (
    _github_oauth_enabled,
    _github_auth_url,
    _oauth_popup_html,
    _github_user_email,
)


class TestOAuthPopupHTML:
    """Test the OAuth popup HTML generator."""

    def test_generates_html_with_token(self):
        with patch("app.api.v1.routes.auth.settings") as mock_settings:
            mock_settings.frontend_url = "http://localhost:3000"
            response = _oauth_popup_html("test_token_value")
            assert response.status_code == 200
            body = response.body.decode()
            assert "test_token_value" in body
            assert "Authentication complete" in body
            assert "Cache-Control" in response.headers

    def test_html_contains_postmessage(self):
        with patch("app.api.v1.routes.auth.settings") as mock_settings:
            mock_settings.frontend_url = "http://localhost:3000"
            response = _oauth_popup_html("abc123")
            body = response.body.decode()
            assert "postMessage" in body
            assert "oauth-token" in body


class TestGitHubUserEmail:
    """Test the GitHub user email fetcher."""

    @pytest.mark.asyncio
    async def test_extracts_email_from_profile(self):
        with patch("app.api.v1.routes.auth.settings") as mock_settings:
            mock_settings.app_name = "TestApp"

            mock_client = AsyncMock()
            user_response = MagicMock()
            user_response.json.return_value = {
                "email": "user@github.com",
                "name": "GitHub User",
                "login": "ghuser"
            }
            user_response.raise_for_status = MagicMock()
            mock_client.get.return_value = user_response

            email, name = await _github_user_email(mock_client, "test_token")
            assert email == "user@github.com"
            assert name == "GitHub User"

    @pytest.mark.asyncio
    async def test_falls_back_to_emails_endpoint(self):
        with patch("app.api.v1.routes.auth.settings") as mock_settings:
            mock_settings.app_name = "TestApp"

            mock_client = AsyncMock()

            # First call returns no email
            user_response = MagicMock()
            user_response.json.return_value = {
                "email": None,
                "name": "No Email User",
                "login": "noemail"
            }
            user_response.raise_for_status = MagicMock()

            # Second call returns emails list
            emails_response = MagicMock()
            emails_response.json.return_value = [
                {"email": "primary@example.com", "primary": True, "verified": True},
                {"email": "secondary@example.com", "primary": False, "verified": True}
            ]
            emails_response.raise_for_status = MagicMock()

            mock_client.get.side_effect = [user_response, emails_response]

            email, name = await _github_user_email(mock_client, "test_token")
            assert email == "primary@example.com"
            assert name == "No Email User"

    @pytest.mark.asyncio
    async def test_raises_when_no_verified_email(self):
        with patch("app.api.v1.routes.auth.settings") as mock_settings:
            mock_settings.app_name = "TestApp"

            mock_client = AsyncMock()
            user_response = MagicMock()
            user_response.json.return_value = {"email": None, "name": "No Email", "login": "noemail"}
            user_response.raise_for_status = MagicMock()

            emails_response = MagicMock()
            emails_response.json.return_value = [
                {"email": "unverified@example.com", "primary": True, "verified": False}
            ]
            emails_response.raise_for_status = MagicMock()

            mock_client.get.side_effect = [user_response, emails_response]

            with pytest.raises(ValueError, match="verified email"):
                await _github_user_email(mock_client, "test_token")

    @pytest.mark.asyncio
    async def test_falls_back_to_login_for_display_name(self):
        with patch("app.api.v1.routes.auth.settings") as mock_settings:
            mock_settings.app_name = "TestApp"

            mock_client = AsyncMock()
            user_response = MagicMock()
            user_response.json.return_value = {
                "email": "user@test.com",
                "name": None,  # No name
                "login": "fallback_login"
            }
            user_response.raise_for_status = MagicMock()
            mock_client.get.return_value = user_response

            email, name = await _github_user_email(mock_client, "token")
            assert name == "fallback_login"


class TestGoogleOAuthRoute:
    """Test Google OAuth login route (mocked)."""

    @pytest.mark.asyncio
    async def test_google_login_missing_token(self, client):
        response = await client.post("/api/v1/auth/google", json={
            "token": ""
        })
        assert response.status_code == 422  # Too short

    @pytest.mark.asyncio
    async def test_google_login_invalid_token(self, client):
        """Test Google login with a fake token (no google lib in test env)."""
        response = await client.post("/api/v1/auth/google", json={
            "token": "a" * 50  # Long enough to pass min_length
        })
        # Should fail during verification — either 401 or 500
        assert response.status_code in (401, 500)


class TestGitHubOAuthRoutes:
    """Test GitHub OAuth flow routes."""

    @pytest.mark.asyncio
    async def test_github_start_enabled(self, client):
        """Test GitHub start with OAuth configured returns redirect."""
        with patch("app.api.v1.routes.auth._github_oauth_enabled", return_value=True), \
             patch("app.api.v1.routes.auth._github_auth_url", return_value="https://github.com/login"):
            response = await client.get("/api/v1/auth/github/start", follow_redirects=False)
            assert response.status_code == 307

    @pytest.mark.asyncio
    async def test_github_callback_enabled_no_state(self, client):
        """Test GitHub callback with OAuth enabled but missing state."""
        with patch("app.api.v1.routes.auth._github_oauth_enabled", return_value=True):
            response = await client.get("/api/v1/auth/github/callback?code=test")
            assert response.status_code == 400


class TestForgotPasswordFlow:
    """Test forgot/reset password flow in more depth."""

    @pytest.mark.asyncio
    async def test_forgot_password_sends_email(self, client):
        """Test full forgot password flow with email sending."""
        # Create user first
        await client.post("/api/v1/auth/signup", json={
            "email": "forgotflow@example.com",
            "password": "SecurePass123!",
            "full_name": "Forgot Flow"
        })

        with patch("app.api.v1.routes.auth.send_password_reset_email",
                    new_callable=AsyncMock) as mock_email:
            mock_email.return_value = False  # Email send fails
            response = await client.post("/api/v1/auth/forgot-password", json={
                "email": "forgotflow@example.com"
            })
            assert response.status_code == 200
            data = response.json()
            assert "message" in data

    @pytest.mark.asyncio
    async def test_reset_password_success_flow(self, client, db_session):
        """Test full reset password flow: signup → forgot → reset."""
        # Create user
        signup = await client.post("/api/v1/auth/signup", json={
            "email": "resetflow@example.com",
            "password": "OldSecurePass123!",
            "full_name": "Reset Flow"
        })
        assert signup.status_code == 200

        # Trigger forgot password to create token
        import secrets
        from app.models.password_reset import PasswordResetToken
        from app.models.user import User
        from sqlalchemy import select

        # Find the user
        result = await db_session.execute(
            select(User).where(User.email == "resetflow@example.com")
        )
        user = result.scalar_one_or_none()
        assert user is not None

        # Create token manually
        reset_token = secrets.token_urlsafe(32)
        token_entry = PasswordResetToken(
            user_id=user.id,
            token=reset_token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
        )
        db_session.add(token_entry)
        await db_session.commit()

        # Use token to reset password
        response = await client.post("/api/v1/auth/reset-password", json={
            "token": reset_token,
            "new_password": "NewSecurePass456!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "successfully" in data["message"].lower()

        # Login with new password
        login = await client.post("/api/v1/auth/login", json={
            "email": "resetflow@example.com",
            "password": "NewSecurePass456!"
        })
        assert login.status_code == 200
