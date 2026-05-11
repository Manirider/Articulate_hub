import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.email import send_password_reset_email, send_welcome_email

@pytest.mark.asyncio
@patch("app.services.email.httpx.AsyncClient")
async def test_send_password_reset_email_success(mock_client_class):
    # Mock settings
    with patch("app.services.email.settings") as mock_settings:
        mock_settings.resend_api_key = "re_123456789"
        
        # Mock httpx client
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_client.post.return_value = mock_response
        
        result = await send_password_reset_email("test@example.com", "Test User", "http://reset.link")
        
        assert result is True
        mock_client.post.assert_called_once()
        args, kwargs = mock_client.post.call_args
        assert kwargs["json"]["to"] == "test@example.com"
        assert "http://reset.link" in kwargs["json"]["html"]

@pytest.mark.asyncio
@patch("app.services.email.httpx.AsyncClient")
async def test_send_password_reset_email_failure(mock_client_class):
    with patch("app.services.email.settings") as mock_settings:
        mock_settings.resend_api_key = "re_123456789"
        
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Error"
        mock_client.post.return_value = mock_response
        
        result = await send_password_reset_email("test@example.com", "Test User", "http://reset.link")
        assert result is False

@pytest.mark.asyncio
async def test_send_password_reset_email_no_key():
    with patch("app.services.email.settings") as mock_settings:
        mock_settings.resend_api_key = "YOUR_RESEND_API_KEY" # Default value
        
        result = await send_password_reset_email("test@example.com", "Test User", "http://reset.link")
        assert result is False

@pytest.mark.asyncio
@patch("app.services.email.httpx.AsyncClient")
async def test_send_welcome_email_success(mock_client_class):
    with patch("app.services.email.settings") as mock_settings:
        mock_settings.resend_api_key = "re_123456789"
        mock_settings.frontend_url = "http://localhost:3000"
        
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_client.post.return_value = mock_response
        
        result = await send_welcome_email("test@example.com", "Test User")
        assert result is True
        mock_client.post.assert_called_once()
