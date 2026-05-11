import pytest
from app.services.ai_pipeline.vision_analyzer import (
    SessionVisionBuffer,
    SessionVoiceBuffer,
    compute_vision_metrics,
    compute_voice_metrics,
    score_eye_contact,
    score_head_stability,
    score_expression,
    score_voice_energy,
    score_voice_pace
)

def test_score_eye_contact():
    # Good eye contact
    frames = [{"eye_yaw": 2.0, "eye_pitch": 1.0}] * 10
    score = score_eye_contact(frames)
    assert score > 90

    # Bad eye contact
    frames = [{"eye_yaw": 25.0, "eye_pitch": 20.0}] * 10
    score = score_eye_contact(frames)
    assert score < 40

    # No frames
    assert score_eye_contact([]) == 50.0

def test_score_head_stability():
    # Stable head
    frames = [{"head_yaw": 0.1, "head_pitch": 0.1, "head_roll": 0.1}] * 10
    score = score_head_stability(frames)
    assert score > 90

    # Unstable head (high jitter)
    frames = [
        {"head_yaw": 10.0, "head_pitch": 5.0, "head_roll": 2.0},
        {"head_yaw": -10.0, "head_pitch": -5.0, "head_roll": -2.0},
        {"head_yaw": 5.0, "head_pitch": 10.0, "head_roll": 5.0}
    ]
    score = score_head_stability(frames)
    assert score < 50

    # Insufficient data
    assert score_head_stability([{"head_yaw": 0.0}] * 2) == 60.0

def test_score_expression():
    # Positive consistent expression
    frames = [{"smile_prob": 0.8, "brow_inner_up": 0.05}] * 10
    score = score_expression(frames)
    assert score > 80

    # Erratic expression
    frames = [
        {"smile_prob": 0.9, "brow_inner_up": 0.1},
        {"smile_prob": 0.1, "brow_inner_up": 0.9},
        {"smile_prob": 0.8, "brow_inner_up": 0.2}
    ]
    score = score_expression(frames)
    assert score < 60

    # No frames
    assert score_expression([]) == 50.0

def test_compute_vision_metrics():
    buffer = SessionVisionBuffer()
    for _ in range(10):
        buffer.frames.append({"eye_yaw": 0.0, "eye_pitch": 0.0, "head_yaw": 0.0, "head_pitch": 0.0, "head_roll": 0.0, "smile_prob": 0.5, "brow_inner_up": 0.1})
    
    metrics = compute_vision_metrics(buffer)
    assert metrics.face_score > 70
    assert metrics.engagement_level == "high"

def test_score_voice_energy():
    # Strong voice
    frames = [{"rms_energy": 0.07}] * 10
    assert score_voice_energy(frames) == 100.0

    # Moderate voice
    frames = [{"rms_energy": 0.04}] * 10
    assert 70 < score_voice_energy(frames) < 100

    # Weak voice
    frames = [{"rms_energy": 0.005}] * 10
    assert score_voice_energy(frames) < 40

    # No frames
    assert score_voice_energy([]) == 50.0

def test_score_voice_pace():
    # Ideal pace
    frames = [{"speech_rate_wpm": 150.0}] * 10
    assert score_voice_pace(frames) == 100.0

    # Too fast
    frames = [{"speech_rate_wpm": 200.0}] * 10
    assert score_voice_pace(frames) < 100.0

    # Too slow
    frames = [{"speech_rate_wpm": 100.0}] * 10
    assert score_voice_pace(frames) < 100.0

    # No frames
    assert score_voice_pace([]) == 50.0

def test_compute_voice_metrics():
    buffer = SessionVoiceBuffer()
    for _ in range(10):
        buffer.frames.append({"rms_energy": 0.05, "speech_rate_wpm": 150.0, "pause_ratio": 0.1})
    
    metrics = compute_voice_metrics(buffer)
    assert metrics.voice_score > 70
    assert metrics.voice_stability == "strong"
