import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.transcription import transcription_service

@pytest.mark.asyncio
@patch("app.services.transcription.httpx.AsyncClient")
async def test_transcribe_success(mock_client_class):
    with patch("app.services.transcription.settings") as mock_settings:
        mock_settings.gladia_api_key = "test_key"
        
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        
        # Mock Upload
        mock_upload_res = MagicMock()
        mock_upload_res.status_code = 200
        mock_upload_res.json.return_value = {"audio_url": "http://audio.url"}
        
        # Mock Start Transcription
        mock_trans_res = MagicMock()
        mock_trans_res.status_code = 200
        mock_trans_res.json.return_value = {"result_url": "http://result.url"}
        
        # Mock Polling
        mock_poll_res = MagicMock()
        mock_poll_res.status_code = 200
        mock_poll_res.json.return_value = {
            "status": "done",
            "result": {"transcription": {"full_transcript": "Hello from Gladia"}}
        }
        
        mock_client.post.side_effect = [mock_upload_res, mock_trans_res]
        mock_client.get.return_value = mock_poll_res
        
        result = await transcription_service.transcribe(b"fake_audio", "test.mp3")
        
        assert result["status"] == "success"
        assert result["text"] == "Hello from Gladia"
        assert result["engine"] == "gladia_v2"

@pytest.mark.asyncio
async def test_transcribe_no_key():
    with patch("app.services.transcription.settings") as mock_settings:
        mock_settings.gladia_api_key = ""
        
        with pytest.raises(RuntimeError, match="GLADIA_API_KEY not configured"):
            await transcription_service.transcribe(b"fake_audio", "test.mp3")

@pytest.mark.asyncio
@patch("app.services.transcription.httpx.AsyncClient")
async def test_transcribe_timeout(mock_client_class):
    with patch("app.services.transcription.settings") as mock_settings:
        mock_settings.gladia_api_key = "test_key"
        
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        
        # Mock Upload and Start
        mock_client.post.side_effect = [
            MagicMock(status_code=200, json=lambda: {"audio_url": "u"}),
            MagicMock(status_code=200, json=lambda: {"result_url": "r"})
        ]
        
        # Mock Polling always "processing"
        mock_client.get.return_value = MagicMock(status_code=200, json=lambda: {"status": "processing"})
        
        # Patch asyncio.sleep to avoid waiting
        with patch("app.services.transcription.asyncio.sleep", return_value=None):
            result = await transcription_service.transcribe(b"fake_audio", "test.mp3")
            assert result["status"] == "timeout"
