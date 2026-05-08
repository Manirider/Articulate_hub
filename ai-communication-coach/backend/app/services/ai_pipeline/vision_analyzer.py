"""
Vision & Voice metrics scoring.

Receives pre-computed facial landmark metrics from the browser-side MediaPipe
pipeline and audio features from the Web Audio API, then produces structured
score objects consumed by the multi-modal fusion engine.
"""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, List


# ────────────────────────────────────────────────────────────────────────────
# Data Classes
# ────────────────────────────────────────────────────────────────────────────

@dataclass
class VisionMetrics:
    eye_contact_score: float = 50.0       # 0-100
    head_stability_score: float = 50.0    # 0-100
    expression_score: float = 50.0        # 0-100
    engagement_level: str = "moderate"    # low | moderate | high
    face_score: float = 50.0             # composite 0-100


@dataclass
class VoiceMetrics:
    energy_score: float = 50.0        # 0-100
    pace_score: float = 50.0          # 0-100
    pause_ratio: float = 0.3          # 0-1
    voice_stability: str = "moderate" # weak | moderate | strong
    voice_score: float = 50.0         # composite 0-100


# ────────────────────────────────────────────────────────────────────────────
# Rolling Buffer for temporal analysis
# ────────────────────────────────────────────────────────────────────────────

@dataclass
class SessionVisionBuffer:
    """Per-session rolling buffer of raw vision frames for temporal analysis."""
    # Each entry: { eye_yaw, eye_pitch, head_yaw, head_pitch, head_roll,
    #               smile_prob, brow_inner_up }
    frames: Deque[Dict[str, float]] = field(default_factory=lambda: deque(maxlen=60))
    # ~30s at 2fps or ~10s at 6fps — enough for rolling statistics


@dataclass
class SessionVoiceBuffer:
    """Per-session rolling buffer of raw voice feature snapshots."""
    frames: Deque[Dict[str, float]] = field(default_factory=lambda: deque(maxlen=30))


# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────

def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, round(value, 2)))


def _variance(values: List[float]) -> float:
    """Population variance of a list of floats."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    return sum((v - mean) ** 2 for v in values) / len(values)


def _std(values: List[float]) -> float:
    return math.sqrt(_variance(values))


# ────────────────────────────────────────────────────────────────────────────
# Vision Scoring
# ────────────────────────────────────────────────────────────────────────────

def score_eye_contact(frames: List[Dict[str, float]]) -> float:
    """
    Score eye contact based on gaze yaw/pitch angles.

    Looking directly at camera → yaw ≈ 0, pitch ≈ 0 → score 100.
    Each degree of deviation reduces the score. Beyond ±30° → score ≈ 0.

    Uses the *median* of recent frames so brief glances away don't
    tank the score instantly.
    """
    if not frames:
        return 50.0

    scores: list[float] = []
    for f in frames:
        yaw = abs(f.get("eye_yaw", 0.0))
        pitch = abs(f.get("eye_pitch", 0.0))
        # Combined angular deviation from center
        deviation = math.sqrt(yaw ** 2 + pitch ** 2)
        # Linear decay: 0° → 100, 30° → 0
        s = max(0.0, 100.0 - (deviation / 30.0) * 100.0)
        scores.append(s)

    # Use 60th percentile (slightly forgiving — occasional glances OK)
    scores.sort()
    idx = int(len(scores) * 0.6)
    return _clamp(scores[min(idx, len(scores) - 1)])


def score_head_stability(frames: List[Dict[str, float]]) -> float:
    """
    Score head stability from rolling variance of head Euler angles.

    Low variance → stable (score ~100).
    High variance (nervous fidgeting) → unstable (score → 0).
    """
    if len(frames) < 3:
        return 60.0  # Insufficient data — default to moderate

    yaws = [f.get("head_yaw", 0.0) for f in frames]
    pitches = [f.get("head_pitch", 0.0) for f in frames]
    rolls = [f.get("head_roll", 0.0) for f in frames]

    # Combined jitter = std of all three axes
    jitter = _std(yaws) + _std(pitches) + _std(rolls)

    # Tuning: jitter < 2° → very stable → 100; jitter > 20° → very unstable → 0
    score = 100.0 - (jitter / 20.0) * 100.0
    return _clamp(score)


def score_expression(frames: List[Dict[str, float]]) -> float:
    """
    Score expression consistency from smile probability and brow position.

    - Consistent positive expression (smile_prob > 0.3) → bonus
    - Erratic changes in expression → penalty
    - Neutral is fine; only excessive variance is penalized
    """
    if not frames:
        return 50.0

    smiles = [f.get("smile_prob", 0.5) for f in frames]
    brows = [f.get("brow_inner_up", 0.0) for f in frames]

    avg_smile = sum(smiles) / len(smiles)
    smile_var = _variance(smiles)
    brow_var = _variance(brows)

    score = 50.0

    # Positive expression bonus
    if avg_smile > 0.4:
        score += 25.0
    elif avg_smile > 0.2:
        score += 10.0

    # Consistency bonus (low variance)
    if smile_var < 0.02:
        score += 15.0
    elif smile_var < 0.05:
        score += 5.0
    else:
        score -= 10.0  # Erratic expression

    # Brow stability
    if brow_var < 0.01:
        score += 10.0
    elif brow_var > 0.05:
        score -= 10.0

    return _clamp(score)


def compute_vision_metrics(buffer: SessionVisionBuffer) -> VisionMetrics:
    """Compute all vision metrics from the rolling buffer."""
    frames = list(buffer.frames)

    eye = score_eye_contact(frames)
    head = score_head_stability(frames)
    expr = score_expression(frames)

    # Composite face score: weighted average
    face = 0.40 * eye + 0.35 * head + 0.25 * expr

    # Engagement level from composite
    if face >= 70:
        engagement = "high"
    elif face >= 45:
        engagement = "moderate"
    else:
        engagement = "low"

    return VisionMetrics(
        eye_contact_score=_clamp(eye),
        head_stability_score=_clamp(head),
        expression_score=_clamp(expr),
        engagement_level=engagement,
        face_score=_clamp(face),
    )


# ────────────────────────────────────────────────────────────────────────────
# Voice Scoring
# ────────────────────────────────────────────────────────────────────────────

def score_voice_energy(frames: List[Dict[str, float]]) -> float:
    """
    Score voice projection from RMS energy.

    Normalized energy > 0.05 → strong; < 0.01 → weak.
    Uses median to ignore brief silent gaps.
    """
    if not frames:
        return 50.0

    energies = sorted([f.get("rms_energy", 0.02) for f in frames])
    median_energy = energies[len(energies) // 2]

    # Map: 0.0 → 0, 0.01 → 40, 0.03 → 70, 0.06+ → 100
    if median_energy >= 0.06:
        return 100.0
    elif median_energy >= 0.03:
        return _clamp(70.0 + (median_energy - 0.03) / 0.03 * 30.0)
    elif median_energy >= 0.01:
        return _clamp(40.0 + (median_energy - 0.01) / 0.02 * 30.0)
    else:
        return _clamp(median_energy / 0.01 * 40.0)


def score_voice_pace(frames: List[Dict[str, float]]) -> float:
    """
    Score speaking pace. Ideal: 130-170 WPM. Too fast or too slow penalized.
    """
    if not frames:
        return 50.0

    rates = [f.get("speech_rate_wpm", 140.0) for f in frames]
    avg_rate = sum(rates) / len(rates)

    # Ideal range: 130-170 WPM → 100
    if 130 <= avg_rate <= 170:
        return 100.0

    # Deviation penalty: ~3 points per WPM outside ideal range
    if avg_rate < 130:
        deviation = 130 - avg_rate
    else:
        deviation = avg_rate - 170

    return _clamp(100.0 - deviation * 1.5)


def compute_voice_metrics(buffer: SessionVoiceBuffer) -> VoiceMetrics:
    """Compute all voice metrics from the rolling buffer."""
    frames = list(buffer.frames)

    energy = score_voice_energy(frames)
    pace = score_voice_pace(frames)

    # Pause ratio: average of reported pause ratios
    pause_ratios = [f.get("pause_ratio", 0.3) for f in frames]
    avg_pause = sum(pause_ratios) / max(len(pause_ratios), 1)

    # Pause penalty: ideal < 0.25, bad > 0.5
    pause_penalty = max(0.0, (avg_pause - 0.25) * 80.0)

    voice = 0.45 * energy + 0.35 * pace + 0.20 * _clamp(100.0 - pause_penalty)

    if voice >= 70:
        stability = "strong"
    elif voice >= 45:
        stability = "moderate"
    else:
        stability = "weak"

    return VoiceMetrics(
        energy_score=_clamp(energy),
        pace_score=_clamp(pace),
        pause_ratio=round(avg_pause, 3),
        voice_stability=stability,
        voice_score=_clamp(voice),
    )
