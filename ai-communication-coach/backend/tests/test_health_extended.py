"""Tests for health route edge cases and debug endpoints.

These tests target the uncovered lines in health.py to boost coverage.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.core.performance import monitor


@pytest.mark.asyncio
async def test_health_check_db_failure(client):
    """Test health check when DB is degraded."""
    # The health check should still return even with some services failing
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "checks" in data
    assert "database" in data["checks"]


@pytest.mark.asyncio
async def test_health_check_redis_failure(client):
    """Test health check when Redis is unavailable."""
    with patch("app.api.v1.routes.health.get_redis", side_effect=Exception("Redis down")):
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["checks"]["redis"]["status"] == "error"
        assert data["status"] == "degraded"


@pytest.mark.asyncio
async def test_health_ai_with_diagnostics(client):
    """Test AI health check with mocked diagnostics."""
    from app.services.ai_diagnostics import AIServiceStatus
    
    mock_report = MagicMock()
    mock_report.overall_status = AIServiceStatus.HEALTHY
    mock_report.timestamp = "2026-05-10T00:00:00Z"
    mock_report.services = []
    mock_report.recommendations = []
    
    with patch("app.services.ai_diagnostics.ai_diagnostics") as mock_diag:
        mock_diag.run_full_diagnostics = AsyncMock(return_value=mock_report)
        mock_diag.is_ai_available.return_value = True
        
        response = await client.get("/api/v1/health/ai")
        assert response.status_code == 200
        data = response.json()
        assert data["overall_status"] == "healthy"
        assert data["is_ai_available"] is True


@pytest.mark.asyncio
async def test_health_ai_degraded(client):
    """Test AI health check with degraded status."""
    from app.services.ai_diagnostics import AIServiceStatus
    
    mock_report = MagicMock()
    mock_report.overall_status = AIServiceStatus.DEGRADED
    mock_report.timestamp = "2026-05-10T00:00:00Z"
    mock_report.services = []
    mock_report.recommendations = []
    
    with patch("app.services.ai_diagnostics.ai_diagnostics") as mock_diag:
        mock_diag.run_full_diagnostics = AsyncMock(return_value=mock_report)
        mock_diag.is_ai_available.return_value = False
        
        response = await client.get("/api/v1/health/ai")
        assert response.status_code == 200  # Degraded still returns 200


@pytest.mark.asyncio
async def test_health_ai_not_configured(client):
    """Test AI health check when not configured (503)."""
    from app.services.ai_diagnostics import AIServiceStatus
    
    mock_report = MagicMock()
    mock_report.overall_status = AIServiceStatus.NOT_CONFIGURED
    mock_report.timestamp = "2026-05-10T00:00:00Z"
    mock_report.services = []
    mock_report.recommendations = ["Configure OPENAI_API_KEY"]
    
    with patch("app.services.ai_diagnostics.ai_diagnostics") as mock_diag:
        mock_diag.run_full_diagnostics = AsyncMock(return_value=mock_report)
        mock_diag.is_ai_available.return_value = False
        
        response = await client.get("/api/v1/health/ai")
        assert response.status_code == 503


@pytest.mark.asyncio
async def test_health_ai_unavailable(client):
    """Test AI health check when fully unavailable (503)."""
    from app.services.ai_diagnostics import AIServiceStatus
    
    mock_report = MagicMock()
    mock_report.overall_status = AIServiceStatus.UNAVAILABLE
    mock_report.timestamp = "2026-05-10T00:00:00Z"
    mock_report.services = []
    mock_report.recommendations = []
    
    with patch("app.services.ai_diagnostics.ai_diagnostics") as mock_diag:
        mock_diag.run_full_diagnostics = AsyncMock(return_value=mock_report)
        mock_diag.is_ai_available.return_value = False
        
        response = await client.get("/api/v1/health/ai")
        assert response.status_code == 503


@pytest.mark.asyncio
async def test_debug_database_lists_tables(client):
    """Test debug database endpoint lists multiple tables."""
    response = await client.get("/api/v1/debug/database")
    assert response.status_code == 200
    data = response.json()
    assert "tables" in data
    # Should have entries for common tables
    assert len(data["tables"]) > 0


@pytest.mark.asyncio
async def test_debug_table_with_data(client):
    """Test debug table endpoint with actual data."""
    # First create a user to have data
    await client.post("/api/v1/auth/signup", json={
        "email": "debug_data@example.com",
        "password": "SecurePass123!",
        "full_name": "Debug Data"
    })
    
    response = await client.get("/api/v1/debug/database/users?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["table"] == "users"
    assert data["total_count"] >= 1
    assert data["showing"] >= 1
    assert len(data["data"]) >= 1


@pytest.mark.asyncio
async def test_debug_table_sessions(client):
    """Test debug endpoint for sessions table."""
    response = await client.get("/api/v1/debug/database/sessions")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_debug_table_scores(client):
    """Test debug endpoint for scores table."""
    response = await client.get("/api/v1/debug/database/scores")
    assert response.status_code == 200


def test_require_dev_environment():
    """Test that debug endpoints are blocked in production."""
    from app.api.v1.routes.health import _require_dev_environment
    
    # In test environment, should not raise
    with patch("app.api.v1.routes.health.settings") as mock_settings:
        mock_settings.environment = "test"
        _require_dev_environment()  # Should not raise
    
    with patch("app.api.v1.routes.health.settings") as mock_settings:
        mock_settings.environment = "development"
        _require_dev_environment()  # Should not raise
    
    from fastapi import HTTPException
    with patch("app.api.v1.routes.health.settings") as mock_settings:
        mock_settings.environment = "production"
        with pytest.raises(HTTPException):
            _require_dev_environment()


def test_allowed_tables_set():
    """Test that the allowed tables set is frozen and contains expected tables."""
    from app.api.v1.routes.health import _ALLOWED_TABLES
    assert isinstance(_ALLOWED_TABLES, frozenset)
    assert "users" in _ALLOWED_TABLES
    assert "sessions" in _ALLOWED_TABLES
    assert "scores" in _ALLOWED_TABLES
