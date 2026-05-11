"""Tests for room management routes (app/api/v1/routes/rooms.py).

Covers room CRUD operations and participant management.
"""
import pytest


async def _get_auth_token(client, email):
    """Helper to signup and return a valid token."""
    response = await client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": "SecurePass123!",
        "full_name": "Room Tester"
    })
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_create_room(client):
    """Test creating a new room."""
    token = await _get_auth_token(client, "room_create@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post("/api/v1/rooms", json={
        "title": "Test Room",
        "mode": "practice",
        "max_participants": 4
    }, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Room"
    assert data["mode"] == "practice"
    assert "id" in data
    assert "code" in data
    assert data["status"] == "waiting"


@pytest.mark.asyncio
async def test_create_room_unauthenticated(client):
    """Test creating room without auth returns 401."""
    response = await client.post("/api/v1/rooms", json={
        "title": "Test Room",
        "mode": "practice",
        "max_participants": 4
    })
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_room_defaults(client):
    """Test creating a room with default values."""
    token = await _get_auth_token(client, "room_defaults@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post("/api/v1/rooms", json={}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Practice Room"
    assert data["mode"] == "practice"
    assert data["max_participants"] == 6


@pytest.mark.asyncio
async def test_get_room_by_id(client):
    """Test getting a specific room by ID."""
    token = await _get_auth_token(client, "room_get@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/v1/rooms", json={
        "title": "Get Test Room",
        "mode": "practice"
    }, headers=headers)
    room_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/rooms/{room_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Get Test Room"


@pytest.mark.asyncio
async def test_get_room_not_found(client):
    """Test getting non-existent room returns 404."""
    token = await _get_auth_token(client, "room_404@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/api/v1/rooms/00000000-0000-0000-0000-000000000000",
                                headers=headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_join_room_by_code(client):
    """Test joining a room via room code."""
    host_token = await _get_auth_token(client, "room_host@example.com")
    host_headers = {"Authorization": f"Bearer {host_token}"}

    create_resp = await client.post("/api/v1/rooms", json={
        "title": "Join Test Room",
        "mode": "practice"
    }, headers=host_headers)
    room_code = create_resp.json()["code"]

    guest_token = await _get_auth_token(client, "room_guest@example.com")
    guest_headers = {"Authorization": f"Bearer {guest_token}"}

    response = await client.post("/api/v1/rooms/join",
                                 json={"code": room_code},
                                 headers=guest_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_join_room_invalid_code(client):
    """Test joining with invalid code returns 404."""
    token = await _get_auth_token(client, "room_inv_code@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post("/api/v1/rooms/join",
                                 json={"code": "INVALID"},
                                 headers=headers)
    assert response.status_code == 404




@pytest.mark.asyncio
async def test_start_room(client):
    """Test starting a room session (host action)."""
    token = await _get_auth_token(client, "room_start@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/v1/rooms", json={
        "title": "Start Test Room",
        "mode": "practice"
    }, headers=headers)
    room_id = create_resp.json()["id"]

    response = await client.post(f"/api/v1/rooms/{room_id}/start",
                                 headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Session started"


@pytest.mark.asyncio
async def test_end_room(client):
    """Test ending a room session."""
    token = await _get_auth_token(client, "room_end@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/v1/rooms", json={
        "title": "End Test Room",
        "mode": "practice"
    }, headers=headers)
    room_id = create_resp.json()["id"]

    await client.post(f"/api/v1/rooms/{room_id}/start", headers=headers)

    response = await client.post(f"/api/v1/rooms/{room_id}/complete",
                                 headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "completed" in data["message"].lower()


@pytest.mark.asyncio
async def test_room_report_no_data(client):
    """Test getting room report when no session data exists."""
    token = await _get_auth_token(client, "room_report@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/v1/rooms", json={
        "title": "Report Test Room",
        "mode": "practice"
    }, headers=headers)
    room_id = create_resp.json()["id"]

    await client.post(f"/api/v1/rooms/{room_id}/start", headers=headers)
    await client.post(f"/api/v1/rooms/{room_id}/end", headers=headers)

    response = await client.get(f"/api/v1/rooms/{room_id}/report",
                                headers=headers)
    assert response.status_code in (200, 404)


@pytest.mark.asyncio
async def test_room_team_mode(client):
    """Test creating a team mode room."""
    token = await _get_auth_token(client, "room_team@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post("/api/v1/rooms", json={
        "title": "Team Battle",
        "mode": "team_2v2",
        "max_participants": 4
    }, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "team_2v2"
