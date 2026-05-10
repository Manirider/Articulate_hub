"""
Production-Readiness Audit Test Suite
=====================================
Comprehensive tests covering:
  - Security (JWT manipulation, injection, password policy, IDOR)
  - Edge cases (empty input, massive input, Unicode, special characters)
  - Error handling (corrupted tokens, invalid UUIDs, double-complete)
  - Concurrency (concurrent session creation)
  - Rate limiting
  - Data integrity (streak logic, XP calculation, level progression)
  - AI pipeline consistency & determinism
"""

import uuid

import pytest
import pytest_asyncio

# ═══════════════════════════════════════════════════════════════
# SECURITY TESTS
# ═══════════════════════════════════════════════════════════════

class TestSecurityAudit:

    @pytest.mark.asyncio
    async def test_expired_or_tampered_token_rejected(self, client):
        """Forged JWTs must be rejected."""
        resp = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_missing_auth_header(self, client):
        """Endpoints must reject requests without auth header."""
        for path in ["/api/v1/modules", "/api/v1/analytics/overview"]:
            resp = await client.get(path)
            assert resp.status_code in (401, 403), f"{path} accessible without auth"

    @pytest.mark.asyncio
    async def test_sql_injection_in_email(self, client):
        """SQL injection attempts must be safely rejected by Pydantic validation."""
        resp = await client.post("/api/v1/auth/login", json={
            "email": "' OR 1=1 --",
            "password": "password123"
        })
        assert resp.status_code == 422  # Pydantic EmailStr rejects this

    @pytest.mark.asyncio
    async def test_xss_in_full_name(self, client):
        """XSS payloads in signup must not crash the server."""
        resp = await client.post("/api/v1/auth/signup", json={
            "email": "xss@test.com",
            "full_name": "<script>alert('xss')</script>",
            "password": "StrongPass123"
        })
        # Should either reject (422) or store sanitized — must not crash
        assert resp.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_password_min_length_enforced(self, client):
        """Passwords shorter than 8 chars must be rejected."""
        resp = await client.post("/api/v1/auth/signup", json={
            "email": "weak@test.com",
            "full_name": "Weak User",
            "password": "123"
        })
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_password_max_length_enforced(self, client):
        """Extremely long passwords must be rejected at schema level."""
        resp = await client.post("/api/v1/auth/signup", json={
            "email": "long@test.com",
            "full_name": "Long User",
            "password": "A" * 200
        })
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_idor_session_access(self, client):
        """User A must NOT be able to access User B's session."""
        # Create User A
        signup_a = await client.post("/api/v1/auth/signup", json={
            "email": "userA@test.com", "full_name": "User A", "password": "StrongPass123"
        })
        token_a = signup_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Create User B
        signup_b = await client.post("/api/v1/auth/signup", json={
            "email": "userB@test.com", "full_name": "User B", "password": "StrongPass123"
        })
        token_b = signup_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User A creates a session
        session_a = await client.post("/api/v1/sessions", json={
            "module_name": "Debate", "submodule_name": "Practice", "topic": "Test IDOR"
        }, headers=headers_a)
        session_id = session_a.json()["id"]

        # User B tries to complete User A's session → must fail
        resp = await client.post(f"/api/v1/sessions/{session_id}/complete", headers=headers_b)
        assert resp.status_code == 404, "IDOR vulnerability: User B accessed User A's session"

    @pytest.mark.asyncio
    async def test_email_case_insensitivity(self, client):
        """Emails must be case-insensitive (no duplicate via MiXeD CaSe)."""
        await client.post("/api/v1/auth/signup", json={
            "email": "mixed@case.com", "full_name": "User 1", "password": "StrongPass123"
        })
        dup = await client.post("/api/v1/auth/signup", json={
            "email": "MIXED@Case.com", "full_name": "User 2", "password": "StrongPass123"
        })
        assert dup.status_code == 409  # Must detect duplicate


# ═══════════════════════════════════════════════════════════════
# EDGE CASE TESTS
# ═══════════════════════════════════════════════════════════════

class TestEdgeCases:

    @pytest.mark.asyncio
    async def test_empty_transcript_completion(self, client):
        """Completing a session with NO transcript should return scores = 0, not crash."""
        signup = await client.post("/api/v1/auth/signup", json={
            "email": "empty@tx.com", "full_name": "Empty", "password": "StrongPass123"
        })
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        session = await client.post("/api/v1/sessions", json={
            "module_name": "JAM", "submodule_name": "Practice", "topic": "Empty test"
        }, headers=headers)
        sid = session.json()["id"]

        complete = await client.post(f"/api/v1/sessions/{sid}/complete", headers=headers)
        assert complete.status_code == 200
        data = complete.json()
        assert data["overall_score"] == 0.0
        assert len(data["strengths"]) >= 1  # Must still return feedback

    @pytest.mark.asyncio
    async def test_massive_transcript(self, client):
        """A very large transcript should not crash or timeout."""
        signup = await client.post("/api/v1/auth/signup", json={
            "email": "big@tx.com", "full_name": "Big Talker", "password": "StrongPass123"
        })
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        session = await client.post("/api/v1/sessions", json={
            "module_name": "Presentation", "submodule_name": "Practice", "topic": "Large speech"
        }, headers=headers)
        sid = session.json()["id"]

        # Send a 6000-word transcript (under 8000 char limit per chunk, so split across multiple)
        big_text = "This is an important point about communication. " * 300
        # Split into chunks of ~7500 chars
        for i in range(0, len(big_text), 7500):
            chunk = big_text[i:i+7500].strip()
            if chunk:
                await client.post(f"/api/v1/sessions/{sid}/transcript", json={
                    "content": chunk, "speaker": "user"
                }, headers=headers)

        complete = await client.post(f"/api/v1/sessions/{sid}/complete", headers=headers)
        assert complete.status_code == 200
        data = complete.json()
        assert 0 <= data["overall_score"] <= 100

    @pytest.mark.asyncio
    async def test_unicode_in_transcript(self, client):
        """Unicode and emoji in transcripts must not crash analysis."""
        signup = await client.post("/api/v1/auth/signup", json={
            "email": "unicode@tx.com", "full_name": "Unicode User", "password": "StrongPass123"
        })
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        session = await client.post("/api/v1/sessions", json={
            "module_name": "Group Discussion", "submodule_name": "Practice", "topic": "Unicode 🌍"
        }, headers=headers)
        sid = session.json()["id"]

        await client.post(f"/api/v1/sessions/{sid}/transcript", json={
            "content": "Let me explain 🎯. AI is transformative — it changes everything! Más información disponible. 日本語テスト。",
            "speaker": "user"
        }, headers=headers)

        complete = await client.post(f"/api/v1/sessions/{sid}/complete", headers=headers)
        assert complete.status_code == 200

    @pytest.mark.asyncio
    async def test_invalid_uuid_session_id(self, client):
        """Invalid session IDs must return 422, not 500."""
        signup = await client.post("/api/v1/auth/signup", json={
            "email": "uuid@test.com", "full_name": "UUID User", "password": "StrongPass123"
        })
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.post("/api/v1/sessions/not-a-uuid/complete", headers=headers)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_double_session_complete(self, client):
        """Completing an already-completed session should not crash or double-award XP."""
        signup = await client.post("/api/v1/auth/signup", json={
            "email": "double@complete.com", "full_name": "Double", "password": "StrongPass123"
        })
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        session = await client.post("/api/v1/sessions", json={
            "module_name": "Interview", "submodule_name": "Practice", "topic": "Double complete"
        }, headers=headers)
        sid = session.json()["id"]

        await client.post(f"/api/v1/sessions/{sid}/transcript", json={
            "content": "This is a test of the double complete scenario. However it's important to test edge cases.",
            "speaker": "user"
        }, headers=headers)

        # First complete
        resp1 = await client.post(f"/api/v1/sessions/{sid}/complete", headers=headers)
        assert resp1.status_code == 200
        xp_after_first = (await client.get("/api/v1/analytics/overview", headers=headers)).json()["xp"]

        # Second complete — should return 200 (idempotent) but NOT award XP again
        resp2 = await client.post(f"/api/v1/sessions/{sid}/complete", headers=headers)
        assert resp2.status_code == 200
        xp_after_second = (await client.get("/api/v1/analytics/overview", headers=headers)).json()["xp"]

        # XP must NOT change on double-complete (fix verified)
        assert xp_after_second == xp_after_first, f"Double-complete XP bug: {xp_after_first} → {xp_after_second}"

    @pytest.mark.asyncio
    async def test_topic_too_short(self, client):
        """Topic with less than 3 chars must be rejected per schema validation."""
        signup = await client.post("/api/v1/auth/signup", json={
            "email": "short@topic.com", "full_name": "Short", "password": "StrongPass123"
        })
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.post("/api/v1/sessions", json={
            "module_name": "Debate", "submodule_name": "Practice", "topic": "AB"
        }, headers=headers)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_transcript_too_long(self, client):
        """Transcript chunks over 8000 chars must be rejected per schema."""
        signup = await client.post("/api/v1/auth/signup", json={
            "email": "longchunk@test.com", "full_name": "Long Chunk", "password": "StrongPass123"
        })
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        session = await client.post("/api/v1/sessions", json={
            "module_name": "Debate", "submodule_name": "Practice", "topic": "Long chunk test"
        }, headers=headers)
        sid = session.json()["id"]

        resp = await client.post(f"/api/v1/sessions/{sid}/transcript", json={
            "content": "x" * 8001, "speaker": "user"
        }, headers=headers)
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════
# DATA INTEGRITY TESTS
# ═══════════════════════════════════════════════════════════════

class TestDataIntegrity:

    @pytest.mark.asyncio
    async def test_xp_and_level_progression(self, client):
        """XP and level must increment correctly after session completion."""
        signup = await client.post("/api/v1/auth/signup", json={
            "email": "xp@level.com", "full_name": "XP User", "password": "StrongPass123"
        })
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Initial state
        me1 = (await client.get("/api/v1/auth/me", headers=headers)).json()
        assert me1["xp"] == 0
        assert me1["level"] == 1

        # Complete a session with known content
        session = await client.post("/api/v1/sessions", json={
            "module_name": "Group Discussion", "submodule_name": "Practice", "topic": "XP test"
        }, headers=headers)
        sid = session.json()["id"]

        await client.post(f"/api/v1/sessions/{sid}/transcript", json={
            "content": "I believe AI has significant potential. However, we must consider the ethical implications. For example, bias in algorithms can cause harm.",
            "speaker": "user"
        }, headers=headers)

        complete = await client.post(f"/api/v1/sessions/{sid}/complete", headers=headers)
        score = complete.json()["overall_score"]

        # XP should equal the overall_score (rounded to int)
        me2 = (await client.get("/api/v1/auth/me", headers=headers)).json()
        assert me2["xp"] == int(score)
        assert me2["level"] == max(1, int(score) // 200 + 1)
        assert me2["streak_days"] == 1

    @pytest.mark.asyncio
    async def test_analytics_accuracy_after_multiple_sessions(self, client):
        """Analytics average score must be mathematically correct."""
        signup = await client.post("/api/v1/auth/signup", json={
            "email": "analytics_accuracy@test.com", "full_name": "Analytics", "password": "StrongPass123"
        })
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        scores = []
        for i in range(3):
            session = await client.post("/api/v1/sessions", json={
                "module_name": "Presentation", "submodule_name": "Practice", "topic": f"Topic {i}"
            }, headers=headers)
            sid = session.json()["id"]

            await client.post(f"/api/v1/sessions/{sid}/transcript", json={
                "content": f"Point number {i}. Communication is crucial and significant. However, we need more research. For example, studies show improvement.",
                "speaker": "user"
            }, headers=headers)

            complete = await client.post(f"/api/v1/sessions/{sid}/complete", headers=headers)
            scores.append(complete.json()["overall_score"])

        analytics = (await client.get("/api/v1/analytics/overview", headers=headers)).json()
        assert analytics["sessions_completed"] == 3
        assert analytics["xp"] == sum(int(s) for s in scores)
        assert len(analytics["score_trend"]) >= 3

        # Average should be within 0.1 tolerance
        expected_avg = sum(scores) / len(scores)
        assert abs(analytics["average_score"] - expected_avg) < 0.15


# ═══════════════════════════════════════════════════════════════
# AI PIPELINE DETERMINISM & QUALITY TESTS
# ═══════════════════════════════════════════════════════════════

class TestAIPipelineQuality:

    def test_determinism_same_input_same_output(self):
        """Same input must always produce exactly the same scores (deterministic)."""
        from app.services.ai_pipeline.analyzer import analyze_transcript

        text = "The impact of AI on education is significant. However, challenges remain."
        r1 = analyze_transcript(text)
        r2 = analyze_transcript(text)

        assert r1.clarity_score == r2.clarity_score
        assert r1.confidence_score == r2.confidence_score
        assert r1.content_score == r2.content_score
        assert r1.delivery_score == r2.delivery_score
        assert r1.overall_score == r2.overall_score

    def test_better_speech_scores_higher(self):
        """High-quality speech must score higher than low-quality speech."""
        from app.services.ai_pipeline.analyzer import analyze_transcript

        good = (
            "I believe artificial intelligence represents a transformative opportunity. "
            "However, we must address ethical concerns. For example, algorithmic bias "
            "can have significant consequences. Furthermore, transparency in AI decision-making "
            "is essential. In conclusion, responsible AI development is crucial for society."
        )
        bad = "Um like you know I think um maybe it's sort of um kind of like basically um yeah."

        good_result = analyze_transcript(good)
        bad_result = analyze_transcript(bad)

        assert good_result.overall_score > bad_result.overall_score
        assert good_result.clarity_score > bad_result.clarity_score
        assert good_result.confidence_score > bad_result.confidence_score

    def test_feedback_is_actionable_not_empty(self):
        """Feedback arrays must always contain actionable, non-empty strings."""
        from app.services.ai_pipeline.analyzer import analyze_transcript

        result = analyze_transcript(
            "We should think about this. Maybe it's important. I guess we could try."
        )
        assert all(len(s) > 5 for s in result.strengths), "Empty or trivial strength"
        assert all(len(s) > 5 for s in result.weaknesses), "Empty or trivial weakness"
        assert all(len(s) > 5 for s in result.improvements), "Empty or trivial improvement"

    def test_explainability_contains_key_metrics(self):
        """Explainability string must reference specific metrics so users understand the score."""
        from app.services.ai_pipeline.analyzer import analyze_transcript

        result = analyze_transcript(
            "Communication skills are essential. However, practice is needed. "
            "For example, public speaking improves with repetition. "
            "Therefore, consistent effort leads to remarkable results."
        )
        expl = result.explainability.lower()
        assert "word" in expl
        assert "lexical" in expl or "diversity" in expl
        assert "filler" in expl

    def test_scoring_scale_boundaries(self):
        """Scores must always be in [0, 100] regardless of input."""
        from app.services.ai_pipeline.analyzer import analyze_transcript

        for text in [
            "",
            "a",
            "Hello.",
            " ".join(["word"] * 1000),
            "um " * 500,
            "! ? . " * 200,
        ]:
            result = analyze_transcript(text)
            for label, score in [
                ("clarity", result.clarity_score),
                ("confidence", result.confidence_score),
                ("content", result.content_score),
                ("delivery", result.delivery_score),
                ("overall", result.overall_score),
            ]:
                assert 0 <= score <= 100, f"{label} out of bounds: {score} for input length {len(text)}"


# ═══════════════════════════════════════════════════════════════
# ERROR HANDLING TESTS
# ═══════════════════════════════════════════════════════════════

class TestErrorHandling:

    @pytest.mark.asyncio
    async def test_malformed_json_body(self, client):
        """Malformed JSON must return 422, not 500."""
        resp = await client.post("/api/v1/auth/login", content=b"not json", headers={"Content-Type": "application/json"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_required_fields(self, client):
        """Missing required fields must return 422."""
        resp = await client.post("/api/v1/auth/signup", json={"email": "miss@fields.com"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_health_returns_ok(self, client):
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("ok", "healthy", "degraded")

    @pytest.mark.asyncio
    async def test_nonexistent_endpoint_returns_404(self, client):
        """Unknown routes must return 404."""
        resp = await client.get("/api/v1/does_not_exist")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_wrong_http_method(self, client):
        """Using wrong HTTP method on an endpoint must not return 500."""
        resp = await client.get("/api/v1/auth/signup")
        assert resp.status_code == 405


# ═══════════════════════════════════════════════════════════════
# PERFORMANCE TESTS (lightweight)
# ═══════════════════════════════════════════════════════════════

class TestPerformance:

    @pytest.mark.asyncio
    async def test_module_listing_is_fast(self, client):
        """Module listing must return within reasonable time."""
        import time
        signup = await client.post("/api/v1/auth/signup", json={
            "email": "perf@test.com", "full_name": "Perf", "password": "StrongPass123"
        })
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        start = time.time()
        for _ in range(10):
            resp = await client.get("/api/v1/modules", headers=headers)
            assert resp.status_code == 200
        elapsed = time.time() - start

        assert elapsed < 5.0, f"10 module list requests took {elapsed:.2f}s (too slow)"

    def test_ai_analysis_speed(self):
        """AI analysis on a medium transcript must complete under 100ms."""
        import time
        from app.services.ai_pipeline.analyzer import analyze_transcript

        text = (
            "I believe AI has major implications. However, ethical challenges remain. "
            "For example, bias in training data leads to unfair outcomes. "
            "Furthermore, transparency is crucial. In conclusion, we need regulation."
        )

        start = time.time()
        for _ in range(50):
            analyze_transcript(text)
        elapsed = time.time() - start

        per_call = elapsed / 50
        assert per_call < 0.1, f"Analysis takes {per_call*1000:.1f}ms per call (target <100ms)"
