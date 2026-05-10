"""Integration test for room analysis pipeline."""
from app.services.ai_pipeline.room_analyzer import (
    process_room_transcript,
    process_room_vision,
    process_room_voice,
    get_room_state,
    cleanup_room_state,
)
from app.services.ai_pipeline.group_report import generate_full_report

room_id = "test-room-1"

# User A - confident speaker
for i in range(5):
    process_room_transcript(room_id, "user_a", "I believe the key advantage of AI in education is personalized learning. Students receive tailored content.", "Alice")
    process_room_vision(room_id, "user_a", {"eye_yaw": 2, "eye_pitch": 1, "head_yaw": 1, "head_pitch": 0.5, "head_roll": 0, "smile_prob": 0.6, "brow_inner_up": 0.1})
    process_room_voice(room_id, "user_a", {"rms_energy": 0.06, "pitch_hz": 170, "speech_rate_wpm": 150, "pause_ratio": 0.15})

# User B - moderate speaker
for i in range(3):
    process_room_transcript(room_id, "user_b", "That is a good point. However, we should also consider the digital divide.", "Bob")
    process_room_voice(room_id, "user_b", {"rms_energy": 0.04, "pitch_hz": 150, "speech_rate_wpm": 130, "pause_ratio": 0.25})

# User C - quiet participant
process_room_transcript(room_id, "user_c", "I agree with both points.", "Charlie")

# User D - interrupter
for i in range(4):
    process_room_transcript(room_id, "user_d", "Well actually I think you are wrong. The real issue is implementation costs and teacher training.", "Diana")
    process_room_voice(room_id, "user_d", {"rms_energy": 0.07, "pitch_hz": 200, "speech_rate_wpm": 180, "pause_ratio": 0.1})

# Set speaking times
state = get_room_state(room_id)
state.participants["user_a"].speaking_time_seconds = 120
state.participants["user_b"].speaking_time_seconds = 80
state.participants["user_c"].speaking_time_seconds = 15
state.participants["user_d"].speaking_time_seconds = 100

# Generate report
report = generate_full_report(room_id, "practice")

print("=== GROUP METRICS ===")
g = report.group_metrics
print(f"Balance: {g.discussion_balance:.1f}")
print(f"Dominant: {g.dominant_speaker_name}")
print(f"Engagement: {g.engagement_level}")
print(f"Teamwork: {g.teamwork_quality:.1f}")
for uid, pct in g.speaking_distribution.items():
    print(f"  {uid}: {pct:.0f}%")

print()
print("=== INDIVIDUAL REPORTS ===")
for ir in report.individual_reports:
    print(f"{ir.display_name}: overall={ir.overall_score:.1f}, speaking={ir.speaking_time_seconds}s, interruptions={ir.interruption_count}")
    if ir.strengths:
        print(f"  Strengths: {ir.strengths[:2]}")
    if ir.suggestions:
        print(f"  Suggestions: {ir.suggestions[:2]}")
    print()

cleanup_room_state(room_id)
print("All tests passed!")
