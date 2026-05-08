"""
Per-participant analysis engine for multi-user room sessions.

Maintains separate vision/voice/transcript buffers per user_id within a room,
computes individual multi-modal scores, and tracks speaking behavior
(speaking time, interruptions, turn-taking).
"""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List

from app.services.ai_pipeline.analyzer import analyze_transcript, extract_metrics
from app.services.ai_pipeline.vision_analyzer import (
    SessionVisionBuffer,
    SessionVoiceBuffer,
    compute_vision_metrics,
    compute_voice_metrics,
)
from app.services.ai_pipeline.multimodal_fusion import fuse_scores, result_to_dict, MultiModalResult


@dataclass
class ParticipantState:
    """Tracks all analysis state for one participant in a room."""
    user_id: str
    display_name: str = ""
    vision_buffer: SessionVisionBuffer = field(default_factory=SessionVisionBuffer)
    voice_buffer: SessionVoiceBuffer = field(default_factory=SessionVoiceBuffer)
    transcript_chunks: list[str] = field(default_factory=list)
    content_score: float = 50.0

    # Speaking behavior
    speaking_time_seconds: float = 0.0
    last_speech_start: float = 0.0
    is_speaking: bool = False
    interruption_count: int = 0
    word_count: int = 0
    filler_count: int = 0

    # Latest fused result
    latest_multimodal: dict | None = None


@dataclass
class RoomAnalyzerState:
    """Manages all participant states within a room."""
    room_id: str
    participants: Dict[str, ParticipantState] = field(default_factory=dict)
    current_speaker: str | None = None
    session_start_time: float = field(default_factory=time.time)

    def get_or_create_participant(self, user_id: str, display_name: str = "") -> ParticipantState:
        if user_id not in self.participants:
            self.participants[user_id] = ParticipantState(user_id=user_id, display_name=display_name)
        elif display_name and not self.participants[user_id].display_name:
            self.participants[user_id].display_name = display_name
        return self.participants[user_id]


# ── Global room analyzer registry ─────────────────────────────────────
_room_states: Dict[str, RoomAnalyzerState] = {}
_MAX_TRANSCRIPT_CHUNKS = 100


def get_room_state(room_id: str) -> RoomAnalyzerState:
    if room_id not in _room_states:
        _room_states[room_id] = RoomAnalyzerState(room_id=room_id)
    return _room_states[room_id]


def cleanup_room_state(room_id: str) -> None:
    _room_states.pop(room_id, None)


def process_room_transcript(room_id: str, user_id: str, content: str, display_name: str = "") -> dict:
    """
    Process a transcript chunk from a specific user in a room.
    Returns live feedback payload for that user.
    """
    state = get_room_state(room_id)
    participant = state.get_or_create_participant(user_id, display_name)

    # Track speaking
    now = time.time()
    if not participant.is_speaking:
        participant.is_speaking = True
        participant.last_speech_start = now

        # Check for interruption
        if state.current_speaker and state.current_speaker != user_id:
            participant.interruption_count += 1

    state.current_speaker = user_id

    # Buffer transcript
    participant.transcript_chunks.append(content)
    if len(participant.transcript_chunks) > _MAX_TRANSCRIPT_CHUNKS:
        participant.transcript_chunks = participant.transcript_chunks[-_MAX_TRANSCRIPT_CHUNKS:]

    # Analyze using last 10 chunks
    merged = " ".join(participant.transcript_chunks[-10:])
    analysis = analyze_transcript(merged)
    metrics = extract_metrics(merged)

    participant.content_score = analysis.overall_score
    participant.word_count = metrics.word_count
    participant.filler_count = metrics.filler_count

    # Update speaking time
    if participant.last_speech_start > 0:
        participant.speaking_time_seconds += now - participant.last_speech_start
        participant.last_speech_start = now

    return {
        "user_id": user_id,
        "confidence_score": analysis.confidence_score,
        "clarity_score": analysis.clarity_score,
        "content_score": analysis.content_score,
        "delivery_score": analysis.delivery_score,
        "overall_score": analysis.overall_score,
        "word_count": metrics.word_count,
        "filler_count": metrics.filler_count,
    }


def process_room_vision(room_id: str, user_id: str, frame: dict) -> None:
    """Append a vision frame for a specific user."""
    state = get_room_state(room_id)
    participant = state.get_or_create_participant(user_id)
    participant.vision_buffer.frames.append(frame)


def process_room_voice(room_id: str, user_id: str, frame: dict) -> None:
    """Append a voice frame for a specific user."""
    state = get_room_state(room_id)
    participant = state.get_or_create_participant(user_id)
    participant.voice_buffer.frames.append(frame)

    # Detect speech start/end from energy
    energy = frame.get("rms_energy", 0.0)
    now = time.time()
    if energy > 0.01:
        if not participant.is_speaking:
            participant.is_speaking = True
            participant.last_speech_start = now
    else:
        if participant.is_speaking:
            participant.is_speaking = False
            if participant.last_speech_start > 0:
                participant.speaking_time_seconds += now - participant.last_speech_start
                participant.last_speech_start = 0


def compute_participant_multimodal(room_id: str, user_id: str) -> dict | None:
    """Compute fused multi-modal result for one participant."""
    state = get_room_state(room_id)
    participant = state.participants.get(user_id)
    if not participant:
        return None

    vision = None
    if len(participant.vision_buffer.frames) > 0:
        vision = compute_vision_metrics(participant.vision_buffer)

    voice = None
    if len(participant.voice_buffer.frames) > 0:
        voice = compute_voice_metrics(participant.voice_buffer)

    result = fuse_scores(vision, voice, participant.content_score)
    payload = result_to_dict(result)
    payload["user_id"] = user_id
    payload["display_name"] = participant.display_name
    payload["speaking_time"] = round(participant.speaking_time_seconds, 1)
    payload["interruptions"] = participant.interruption_count
    payload["word_count"] = participant.word_count

    participant.latest_multimodal = payload
    return payload


def get_all_participant_multimodal(room_id: str) -> List[dict]:
    """Get latest multi-modal results for all participants in a room."""
    state = get_room_state(room_id)
    results = []
    for user_id in state.participants:
        result = compute_participant_multimodal(room_id, user_id)
        if result:
            results.append(result)
    return results
