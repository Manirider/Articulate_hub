import pytest
from collections import deque
from app.services.ai_pipeline.vision_analyzer import (
    SessionVisionBuffer,
    SessionVoiceBuffer,
    compute_vision_metrics,
    compute_voice_metrics,
    score_eye_contact,
    score_head_stability,
    score_expression,
    score_voice_energy,
    score_voice_pace,
)

def test_eye_contact_scoring():
    # Perfect eye contact
    frames = [{"eye_yaw": 0.0, "eye_pitch": 0.0}] * 10
    assert score_eye_contact(frames) == 100.0
    
    # Deviated eye contact
    frames = [{"eye_yaw": 15.0, "eye_pitch": 15.0}] * 10
    # deviation = sqrt(15^2 + 15^2) = sqrt(450) approx 21.2
    # score = 100 - (21.2 / 30) * 100 approx 29.3
    score = score_eye_contact(frames)
    assert 20 < score < 40
    
    # Extreme deviation
    frames = [{"eye_yaw": 40.0, "eye_pitch": 40.0}] * 10
    assert score_eye_contact(frames) == 0.0

def test_head_stability_scoring():
    # Stable head
    frames = [{"head_yaw": 0.0, "head_pitch": 0.0, "head_roll": 0.0}] * 10
    assert score_head_stability(frames) == 100.0
    
    # Fidgeting head
    frames = []
    for i in range(10):
        frames.append({
            "head_yaw": i * 2.0, 
            "head_pitch": i * 2.0, 
            "head_roll": i * 2.0
        })
    score = score_head_stability(frames)
    assert score < 60

def test_expression_scoring():
    # Smiling and consistent
    frames = [{"smile_prob": 0.8, "brow_inner_up": 0.1}] * 10
    score = score_expression(frames)
    assert score > 80
    
    # Tense/Neutral
    frames = [{"smile_prob": 0.05, "brow_inner_up": 0.0}] * 10
    score = score_expression(frames)
    assert score <= 75.0

def test_voice_energy_scoring():
    # Strong energy
    frames = [{"rms_energy": 0.1}] * 10
    assert score_voice_energy(frames) == 100.0
    
    # Low energy
    frames = [{"rms_energy": 0.005}] * 10
    assert score_voice_energy(frames) < 30

def test_voice_pace_scoring():
    # Ideal pace
    frames = [{"speech_rate_wpm": 150.0}] * 10
    assert score_voice_pace(frames) == 100.0
    
    # Fast pace
    frames = [{"speech_rate_wpm": 220.0}] * 10
    assert score_voice_pace(frames) < 50
    
    # Slow pace
    frames = [{"speech_rate_wpm": 80.0}] * 10
    assert score_voice_pace(frames) < 50

def test_compute_vision_metrics():
    buffer = SessionVisionBuffer()
    buffer.frames.extend([{"eye_yaw": 0.0, "eye_pitch": 0.0, "head_yaw": 0.0, "head_pitch": 0.0, "head_roll": 0.0, "smile_prob": 0.5, "brow_inner_up": 0.0}] * 5)
    metrics = compute_vision_metrics(buffer)
    assert metrics.face_score > 70
    assert metrics.engagement_level == "high"

def test_compute_voice_metrics():
    buffer = SessionVoiceBuffer()
    buffer.frames.extend([{"rms_energy": 0.05, "speech_rate_wpm": 150.0, "pause_ratio": 0.1}] * 5)
    metrics = compute_voice_metrics(buffer)
    assert metrics.voice_score > 80
    assert metrics.voice_stability == "strong"
