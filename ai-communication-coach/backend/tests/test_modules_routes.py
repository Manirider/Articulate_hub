"""Tests for modules endpoint (app/api/v1/routes/modules.py)."""
import pytest


async def _get_auth_token(client, email="module_test@example.com"):
    """Helper to create a user and return the auth token."""
    response = await client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": "SecurePass123!",
        "full_name": "Module Tester"
    })
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_list_modules(client):
    """Test listing all available modules."""
    token = await _get_auth_token(client, "list_modules@example.com")
    response = await client.get("/api/v1/modules", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    for mod in data:
        assert "id" in mod
        assert "name" in mod


@pytest.mark.asyncio
async def test_get_module_detail(client):
    """Test getting topic suggestions for a module."""
    token = await _get_auth_token(client, "module_detail@example.com")
    # Get topic suggestions
    response = await client.get("/api/v1/modules/topics/Debate", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["module_name"] == "Debate"
    assert len(data["suggestions"]) > 0


@pytest.mark.asyncio
async def test_get_module_topics_unknown(client):
    """Test getting topic suggestions for unknown module falls back."""
    token = await _get_auth_token(client, "module_unknown@example.com")
    response = await client.get("/api/v1/modules/topics/UnknownModule", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["module_name"] == "UnknownModule"
    # Should fall back to Group Discussion suggestions
    assert len(data["suggestions"]) > 0


@pytest.mark.asyncio
async def test_modules_unauthenticated(client):
    """Test that modules endpoint requires auth."""
    response = await client.get("/api/v1/modules")
    assert response.status_code in (401, 403)
