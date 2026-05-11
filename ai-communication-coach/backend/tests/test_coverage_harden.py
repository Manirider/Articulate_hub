"""Hardening tests to close coverage gaps in rooms and teams routes."""
import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from app.models.user import User
from app.models.room import Room
from app.models.room_participant import RoomParticipant
from app.models.room_report import RoomReport
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.session import Session
from app.models.performance_history import PerformanceHistory
from app.models.vision_score import VisionScore

async def _get_auth_token(client, email, name="Tester"):
    response = await client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": "SecurePass123!",
        "full_name": name
    })
    return response.json()["access_token"]

@pytest.mark.asyncio
async def test_rooms_coverage_gap(client, db_session):
    token = await _get_auth_token(client, "gap_rooms@example.com", "Host User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Room
    resp = await client.post("/api/v1/rooms", json={"title": "Gap Room", "mode": "team_2v2", "max_participants": 2}, headers=headers)
    room_data = resp.json()
    room_id = room_data["id"]
    room_code = room_data["code"]

    # 2. Join room when already in (Line 95-96)
    resp = await client.post("/api/v1/rooms/join", json={"code": room_code}, headers=headers)
    assert resp.status_code == 200

    # 3. Join room capacity check (Line 106-107)
    # Join with second user
    token2 = await _get_auth_token(client, "gap_rooms2@example.com", "User 2")
    headers2 = {"Authorization": f"Bearer {token2}"}
    resp = await client.post("/api/v1/rooms/join", json={"code": room_code}, headers=headers2)
    assert resp.status_code == 200
    
    # Now room is full (max 2)
    token3 = await _get_auth_token(client, "gap_rooms3@example.com", "User 3")
    headers3 = {"Authorization": f"Bearer {token3}"}
    resp = await client.post("/api/v1/rooms/join", json={"code": room_code}, headers=headers3)
    assert resp.status_code == 400
    assert "full" in resp.json()["detail"].lower()

    # 4. Start room error cases
    # Not found
    resp = await client.post(f"/api/v1/rooms/{uuid.uuid4()}/start", headers=headers)
    assert resp.status_code == 404
    
    # Not host
    resp = await client.post(f"/api/v1/rooms/{room_id}/start", headers=headers2)
    assert resp.status_code == 403
    
    # Already started
    await client.post(f"/api/v1/rooms/{room_id}/start", headers=headers)
    resp = await client.post(f"/api/v1/rooms/{room_id}/start", headers=headers)
    assert resp.status_code == 400

    # 5. Complete room & Report flow (Line 168-235)
    resp = await client.post(f"/api/v1/rooms/{room_id}/complete", headers=headers)
    assert resp.status_code == 200
    
    # Already completed
    resp = await client.post(f"/api/v1/rooms/{room_id}/complete", headers=headers)
    assert "already completed" in resp.json()["message"].lower()

    # 6. Get report (Line 248-303)
    resp = await client.get(f"/api/v1/rooms/{room_id}/report", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["room_id"] == room_id
    assert "group_metrics" in resp.json()

@pytest.mark.asyncio
async def test_teams_coverage_gap(client, db_session):
    # 1. Setup User and Team
    token = await _get_auth_token(client, "gap_teams@example.com", "Manager User")
    headers = {"Authorization": f"Bearer {token}"}
    
    user_result = await db_session.execute(select(User).where(User.email == "gap_teams@example.com"))
    user = user_result.scalar_one()

    resp = await client.post("/api/v1/teams", json={"name": "Gap Team", "description": "Desc"}, headers=headers)
    team_data = resp.json()
    team_id = team_data["id"]
    invite_code = team_data["invite_code"]

    # 2. Add some data for analytics (Line 162-230)
    # Create a session
    sess = Session(
        user_id=user.id,
        module_name="Public Speaking",
        submodule_name="Introduction",
        topic="Self Intro",
        status="completed"
    )
    db_session.add(sess)
    await db_session.flush()
    
    # Add performance history
    ph = PerformanceHistory(
        user_id=user.id,
        session_id=sess.id,
        overall_score=85.0,
        clarity_score=80.0,
        confidence_score=90.0,
        content_score=85.0,
        delivery_score=85.0
    )
    db_session.add(ph)
    
    # Add vision score
    vs = VisionScore(
        session_id=sess.id,
        face_score=95.0,
        eye_contact_score=90.0,
        voice_score=88.0
    )
    db_session.add(vs)
    await db_session.commit()

    # 3. Analytics flow
    resp = await client.get(f"/api/v1/teams/{team_id}/analytics", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_sessions"] == 1
    assert data["average_score"] == 85.0
    assert data["average_vision"] == 95.0
    assert len(data["members"]) >= 1

    # 4. Error cases
    # Not found
    resp = await client.get(f"/api/v1/teams/{uuid.uuid4()}/analytics", headers=headers)
    assert resp.status_code == 404
    
    # Manager access required
    token2 = await _get_auth_token(client, "gap_teams2@example.com", "Member User")
    headers2 = {"Authorization": f"Bearer {token2}"}
    # Join first
    await client.post("/api/v1/teams/join", json={"invite_code": invite_code}, headers=headers2)
    
    resp = await client.get(f"/api/v1/teams/{team_id}/analytics", headers=headers2)
    assert resp.status_code == 403
    assert "manager" in resp.json()["detail"].lower()

    # 5. List and Get reloads
    resp = await client.get("/api/v1/teams", headers=headers)
    assert resp.status_code == 200
    
    resp = await client.get(f"/api/v1/teams/{team_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Gap Team"
