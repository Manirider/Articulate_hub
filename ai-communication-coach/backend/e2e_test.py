"""Quick E2E API validation script."""
import requests

BASE = "http://localhost:8000/api/v1"

# 1. Signup or Login
r = requests.post(f"{BASE}/auth/signup", json={"email": "e2e@audit.com", "full_name": "E2E Auditor", "password": "StrongPass123"})
print(f"Signup: {r.status_code}")
if r.status_code == 409:
    # User exists, try login
    r = requests.post(f"{BASE}/auth/login", json={"email": "e2e@audit.com", "password": "StrongPass123"})
    print(f"Login fallback: {r.status_code}")
    
token = r.json().get("access_token", "")
h = {"Authorization": f"Bearer {token}"}

# 2. Me
r = requests.get(f"{BASE}/auth/me", headers=h)
print(f"Me: {r.status_code} - {r.json()}")

# 3. Modules
r = requests.get(f"{BASE}/modules", headers=h)
modules = r.json()
print(f"Modules: {r.status_code} - {len(modules)} modules")
for m in modules:
    print(f"  - {m['name']} ({len(m['submodules'])} submodules)")

# 4. Create Session
r = requests.post(f"{BASE}/sessions", json={
    "module_name": "Group Discussion",
    "submodule_name": "Personal Practice",
    "topic": "Impact of AI on education"
}, headers=h)
print(f"Create Session: {r.status_code}")
sid = r.json()["id"]

# 5. Add transcript
transcript = (
    "I believe artificial intelligence will fundamentally transform education. "
    "However, we must carefully consider the ethical implications. "
    "For example, personalized learning could dramatically help students. "
    "Furthermore, adaptive systems can identify crucial knowledge gaps. "
    "The essential question remains: how do we ensure significant access? "
    "In conclusion, strategic deployment of AI represents a transformative opportunity."
)
r = requests.post(f"{BASE}/sessions/{sid}/transcript", json={"content": transcript, "speaker": "user"}, headers=h)
print(f"Add Transcript: {r.status_code}")

# 6. Complete Session
r = requests.post(f"{BASE}/sessions/{sid}/complete", headers=h)
print(f"Complete Session: {r.status_code}")
result = r.json()
print(f"  Overall: {result['overall_score']}, Clarity: {result['clarity_score']}")
print(f"  Confidence: {result['confidence_score']}, Content: {result['content_score']}")
print(f"  Delivery: {result['delivery_score']}")
print(f"  Strengths: {result['strengths']}")
print(f"  Weaknesses: {result['weaknesses']}")
print(f"  Improvements: {result['improvements']}")

# 7. Idempotent re-complete
r = requests.post(f"{BASE}/sessions/{sid}/complete", headers=h)
print(f"Re-complete (idempotent): {r.status_code} - score={r.json()['overall_score']}")

# 8. Analytics
r = requests.get(f"{BASE}/analytics/overview", headers=h)
a = r.json()
print(f"Analytics: {r.status_code}")
print(f"  Sessions: {a['sessions_completed']}, Avg: {a['average_score']}, XP: {a['xp']}, Level: {a['level']}")

# 9. Leaderboard
r = requests.get(f"{BASE}/analytics/leaderboard", headers=h)
print(f"Leaderboard: {r.status_code}")
lb = r.json()
print(f"  Top user: {lb['leaderboard'][0]['name']} (XP: {lb['leaderboard'][0]['xp']})")

# 10. Security: No auth
r = requests.get(f"{BASE}/modules")
print(f"No auth access: {r.status_code} (should be 401)")

print("\n=== E2E API TEST PASSED ===")
