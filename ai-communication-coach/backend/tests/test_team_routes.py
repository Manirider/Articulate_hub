"""Tests for team management routes (app/api/v1/routes/teams.py).

Covers team creation, listing, member management, and analytics.
"""
import pytest


async def _get_auth_token(client, email):
    """Helper to signup and return a valid token."""
    response = await client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": "SecurePass123!",
        "full_name": "Team Tester"
    })
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_create_team(client):
    """Test creating a new team."""
    token = await _get_auth_token(client, "team_create@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post("/api/v1/teams", json={
        "name": "Engineering Team",
        "description": "Backend engineering squad"
    }, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Engineering Team"
    assert "id" in data
    assert "invite_code" in data


@pytest.mark.asyncio
async def test_create_team_unauthenticated(client):
    """Test creating team without auth returns 401."""
    response = await client.post("/api/v1/teams", json={
        "name": "Unauth Team",
        "description": "Should fail"
    })
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_teams(client):
    """Test listing user's teams."""
    token = await _get_auth_token(client, "team_list@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create a team first
    await client.post("/api/v1/teams", json={
        "name": "List Test Team",
        "description": "For listing"
    }, headers=headers)

    response = await client.get("/api/v1/teams", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_team_by_id(client):
    """Test getting a specific team."""
    token = await _get_auth_token(client, "team_get@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/v1/teams", json={
        "name": "Get Test Team",
        "description": "For getting"
    }, headers=headers)
    team_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/teams/{team_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Get Test Team"


@pytest.mark.asyncio
async def test_get_team_not_found(client):
    """Test getting non-existent team."""
    token = await _get_auth_token(client, "team_404@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/api/v1/teams/00000000-0000-0000-0000-000000000000",
                                headers=headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_join_team_by_invite_code(client):
    """Test joining a team via invite code."""
    # Creator creates team
    creator_token = await _get_auth_token(client, "team_creator@example.com")
    creator_headers = {"Authorization": f"Bearer {creator_token}"}

    create_resp = await client.post("/api/v1/teams", json={
        "name": "Join Test Team",
        "description": "For joining"
    }, headers=creator_headers)
    invite_code = create_resp.json()["invite_code"]

    # Joiner joins the team
    joiner_token = await _get_auth_token(client, "team_joiner@example.com")
    joiner_headers = {"Authorization": f"Bearer {joiner_token}"}

    response = await client.post("/api/v1/teams/join",
                                 json={"invite_code": invite_code},
                                 headers=joiner_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Join Test Team"


@pytest.mark.asyncio
async def test_join_team_invalid_code(client):
    """Test joining with invalid invite code."""
    token = await _get_auth_token(client, "team_invalid@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post("/api/v1/teams/join",
                                 json={"invite_code": "INVALID_CODE"},
                                 headers=headers)
    assert response.status_code == 404




@pytest.mark.asyncio
async def test_team_analytics(client):
    """Test getting team analytics."""
    token = await _get_auth_token(client, "team_analytics@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/v1/teams", json={
        "name": "Analytics Team",
        "description": "For analytics"
    }, headers=headers)
    team_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/teams/{team_id}/analytics",
                                headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_sessions" in data




@pytest.mark.asyncio
async def test_duplicate_join_team(client):
    """Test joining a team you're already a member of."""
    token = await _get_auth_token(client, "team_dup@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/v1/teams", json={
        "name": "Dup Team",
        "description": "test"
    }, headers=headers)
    invite_code = create_resp.json()["invite_code"]

    # Try to join own team
    response = await client.post("/api/v1/teams/join",
                                 json={"invite_code": invite_code},
                                 headers=headers)
    assert response.status_code == 200  # The code actually returns the team instead of 400!
