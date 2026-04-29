import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_signup_and_login(client):
    # Signup
    signup = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "coach@example.com",
            "full_name": "Coach User",
            "password": "StrongPass123",
        },
    )
    assert signup.status_code == 200
    token = signup.json()["access_token"]
    assert token

    # Login with same credentials
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "coach@example.com", "password": "StrongPass123"},
    )
    assert login.status_code == 200
    assert login.json()["access_token"]

    # Me endpoint
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    data = me.json()
    assert data["email"] == "coach@example.com"
    assert data["full_name"] == "Coach User"
    assert data["xp"] == 0
    assert data["level"] == 1


@pytest.mark.asyncio
async def test_duplicate_signup_returns_409(client):
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "dup@example.com", "full_name": "Dup", "password": "StrongPass123"},
    )
    dup = await client.post(
        "/api/v1/auth/signup",
        json={"email": "dup@example.com", "full_name": "Dup2", "password": "StrongPass123"},
    )
    assert dup.status_code == 409


@pytest.mark.asyncio
async def test_invalid_login(client):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "WrongPass123"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_without_token(client):
    resp = await client.get("/api/v1/modules")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_modules_list(client):
    signup = await client.post(
        "/api/v1/auth/signup",
        json={"email": "mod@example.com", "full_name": "Mod User", "password": "StrongPass123"},
    )
    token = signup.json()["access_token"]

    modules = await client.get("/api/v1/modules", headers={"Authorization": f"Bearer {token}"})
    assert modules.status_code == 200
    data = modules.json()
    assert len(data) >= 5
    names = {m["name"] for m in data}
    assert "Group Discussion" in names
    assert "Debate" in names
    assert "Presentation" in names
    assert "JAM" in names
    assert "Interview" in names

    # Each module has submodules
    for module in data:
        assert len(module["submodules"]) == 4


@pytest.mark.asyncio
async def test_topic_suggestions(client):
    signup = await client.post(
        "/api/v1/auth/signup",
        json={"email": "topics@example.com", "full_name": "Topics", "password": "StrongPass123"},
    )
    token = signup.json()["access_token"]

    resp = await client.get(
        "/api/v1/modules/topics/Group Discussion",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["module_name"] == "Group Discussion"
    assert len(data["suggestions"]) >= 3


@pytest.mark.asyncio
async def test_full_session_flow(client):
    """End-to-end: signup -> create session -> add transcript -> complete -> analytics"""

    # Signup
    signup = await client.post(
        "/api/v1/auth/signup",
        json={"email": "flow@example.com", "full_name": "Flow User", "password": "StrongPass123"},
    )
    token = signup.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create session
    session_resp = await client.post(
        "/api/v1/sessions",
        json={
            "module_name": "Group Discussion",
            "submodule_name": "Personal Practice",
            "topic": "The future of AI in education",
        },
        headers=headers,
    )
    assert session_resp.status_code == 200
    session_data = session_resp.json()
    session_id = session_data["id"]
    assert session_data["status"] == "active"

    # Add transcript chunks
    transcript_text = (
        "I believe artificial intelligence will fundamentally transform education. "
        "However, we must consider the ethical implications carefully. "
        "For example, personalized learning powered by AI could help students "
        "who struggle with traditional teaching methods. Furthermore, adaptive "
        "systems can identify knowledge gaps early and provide targeted support. "
        "The crucial question is how we ensure equitable access to these remarkable "
        "technologies across all socioeconomic backgrounds."
    )

    resp_t = await client.post(
        f"/api/v1/sessions/{session_id}/transcript",
        json={"content": transcript_text, "speaker": "user"},
        headers=headers,
    )
    assert resp_t.status_code == 200

    # Complete session
    complete = await client.post(
        f"/api/v1/sessions/{session_id}/complete",
        headers=headers,
    )
    assert complete.status_code == 200
    result = complete.json()

    # Validate scoring output
    assert 0 <= result["overall_score"] <= 100
    assert 0 <= result["clarity_score"] <= 100
    assert 0 <= result["confidence_score"] <= 100
    assert 0 <= result["content_score"] <= 100
    assert 0 <= result["delivery_score"] <= 100
    assert len(result["strengths"]) >= 1
    assert len(result["weaknesses"]) >= 1
    assert len(result["improvements"]) >= 1
    assert result["explainability"]

    # Analytics should reflect the completed session
    analytics = await client.get("/api/v1/analytics/overview", headers=headers)
    assert analytics.status_code == 200
    analytics_data = analytics.json()
    assert analytics_data["sessions_completed"] >= 1
    assert analytics_data["xp"] > 0
    assert len(analytics_data["score_trend"]) >= 1


@pytest.mark.asyncio
async def test_session_not_found(client):
    signup = await client.post(
        "/api/v1/auth/signup",
        json={"email": "notfound@example.com", "full_name": "NF", "password": "StrongPass123"},
    )
    token = signup.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/v1/sessions/00000000-0000-0000-0000-000000000001/complete",
        headers=headers,
    )
    assert resp.status_code == 404
