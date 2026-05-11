"""Tests for health check routes (app/api/v1/routes/health.py)."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_health_check(client):
    """Test main health check endpoint."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["service"] == "ai-communication-coach-backend"
    assert "version" in data
    assert "timestamp" in data
    assert "checks" in data
    assert "database" in data["checks"]
    assert "ai_services" in data["checks"]
    assert "oauth" in data["checks"]
    assert "redis" in data["checks"]


@pytest.mark.asyncio
async def test_readiness_check(client):
    """Test readiness probe endpoint."""
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("ready", "not_ready")


@pytest.mark.asyncio
async def test_liveness_check(client):
    """Test liveness probe endpoint."""
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"


@pytest.mark.asyncio
async def test_performance_metrics(client):
    """Test performance metrics endpoint."""
    response = await client.get("/api/v1/health/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "api_summary" in data
    assert "db_summary" in data


@pytest.mark.asyncio
async def test_circuit_breaker_status(client):
    """Test circuit breaker status endpoint."""
    response = await client.get("/api/v1/health/circuit-breakers")
    assert response.status_code == 200
    data = response.json()
    assert "circuit_breakers" in data
    assert len(data["circuit_breakers"]) == 3
    names = [cb["name"] for cb in data["circuit_breakers"]]
    assert "openai" in names
    assert "gladia" in names
    assert "ollama" in names


@pytest.mark.asyncio
async def test_ai_health_check(client):
    """Test AI health check endpoint."""
    response = await client.get("/api/v1/health/ai")
    data = response.json()
    if response.status_code == 429:
        pytest.skip("Rate limited")
    # Without API keys configured, should return 503
    assert "overall_status" in data
    assert "services" in data
    assert "is_ai_available" in data


@pytest.mark.asyncio
async def test_debug_database(client):
    """Test debug database endpoint (dev/test environment only)."""
    response = await client.get("/api/v1/debug/database")
    assert response.status_code == 200
    data = response.json()
    assert "database_type" in data
    assert "tables" in data


@pytest.mark.asyncio
async def test_debug_table_valid(client):
    """Test debug endpoint for a specific valid table."""
    response = await client.get("/api/v1/debug/database/users")
    assert response.status_code == 200
    data = response.json()
    assert data["table"] == "users"


@pytest.mark.asyncio
async def test_debug_table_invalid(client):
    """Test debug endpoint for an invalid table returns 400."""
    response = await client.get("/api/v1/debug/database/evil_table")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_debug_table_limit_clamped(client):
    """Test that the limit parameter is clamped."""
    response = await client.get("/api/v1/debug/database/users?limit=100")
    if response.status_code == 429:
        pytest.skip("Rate limited")
    assert response.status_code == 200
    data = response.json()
    assert data.get("showing", 0) <= 50  # Max limit is 50
