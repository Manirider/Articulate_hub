import pytest
import time
from app.services.ai_pipeline.room_analyzer import (
    get_room_state,
    cleanup_room_state,
    process_room_transcript,
    process_room_vision,
    process_room_voice,
    compute_participant_multimodal,
    get_all_participant_multimodal
)

def test_room_registry():
    room_id = "test_room_123"
    state = get_room_state(room_id)
    assert state.room_id == room_id
    
    # Same room should return same state
    assert get_room_state(room_id) is state
    
    cleanup_room_state(room_id)
    # After cleanup, should be a new state
    assert get_room_state(room_id) is not state

def test_process_room_transcript():
    room_id = "test_room_transcript"
    user_id = "user_1"
    
    res = process_room_transcript(room_id, user_id, "Hello world", "User One")
    assert res["user_id"] == user_id
    assert res["word_count"] > 0
    
    state = get_room_state(room_id)
    participant = state.participants[user_id]
    assert participant.display_name == "User One"
    assert participant.is_speaking is True

    # Test interruption
    process_room_transcript(room_id, "user_2", "Interruption here", "User Two")
    state = get_room_state(room_id)
    assert state.current_speaker == "user_2"
    assert state.participants["user_2"].interruption_count == 1

def test_process_room_vision_voice():
    room_id = "test_room_media"
    user_id = "user_1"
    
    process_room_vision(room_id, user_id, {"eye_yaw": 0.0})
    process_room_voice(room_id, user_id, {"rms_energy": 0.05})
    
    state = get_room_state(room_id)
    participant = state.participants[user_id]
    assert len(participant.vision_buffer.frames) == 1
    assert len(participant.voice_buffer.frames) == 1

def test_multimodal_aggregation():
    room_id = "test_room_aggregate"
    user_id = "user_1"
    
    # Seed some data
    process_room_transcript(room_id, user_id, "Highly competent professional speech.", "Expert")
    process_room_vision(room_id, user_id, {"eye_yaw": 0.0, "eye_pitch": 0.0, "head_yaw": 0.0, "head_pitch": 0.0, "head_roll": 0.0, "smile_prob": 0.5, "brow_inner_up": 0.1})
    process_room_voice(room_id, user_id, {"rms_energy": 0.05, "speech_rate_wpm": 150.0, "pause_ratio": 0.1})
    
    result = compute_participant_multimodal(room_id, user_id)
    assert result["user_id"] == user_id
    assert result["display_name"] == "Expert"
    assert "confidence_score" in result
    
    all_results = get_all_participant_multimodal(room_id)
    assert len(all_results) == 1
    assert all_results[0]["user_id"] == user_id
