"""
Multi-Modal Fusion Engine.

Combines vision (face), voice (audio), and content (transcript) scores
into a single composite confidence score using the weighted formula:

    Confidence = 0.4 × Voice + 0.4 × Face + 0.2 × Content

Handles graceful degradation when one or more signals are unavailable.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from app.services.ai_pipeline.vision_analyzer import VisionMetrics, VoiceMetrics


@dataclass
class MultiModalResult:
    """The final fused output returned to the frontend."""
    confidence_score: float                  # 0-10 scale
    eye_contact: str                         # "good" | "moderate" | "needs_improvement"
    head_movement: str                       # "stable" | "moderate" | "unstable"
    voice_stability: str                     # "strong" | "moderate" | "weak"
    engagement: str                          # "high" | "moderate" | "low"
    face_score: float                        # 0-100 raw
    voice_score: float                       # 0-100 raw
    content_score: float                     # 0-100 raw
    suggestions: List[str] = field(default_factory=list)
    active_signals: List[str] = field(default_factory=list)


def _classify(score: float, high: float = 70, low: float = 45) -> str:
    """Map a 0-100 score to a three-tier label."""
    if score >= high:
        return "good"
    elif score >= low:
        return "moderate"
    return "needs_improvement"


def _classify_stability(score: float) -> str:
    if score >= 70:
        return "stable"
    elif score >= 45:
        return "moderate"
    return "unstable"


def fuse_scores(
    vision: Optional[VisionMetrics],
    voice: Optional[VoiceMetrics],
    content_score: float = 50.0,
) -> MultiModalResult:
    """
    Perform weighted multi-modal fusion.

    If a signal is missing, its weight is redistributed proportionally
    among the remaining signals.
    """
    weights = {"voice": 0.4, "face": 0.4, "content": 0.2}
    scores = {"content": content_score}
    active_signals = ["transcript"]

    if vision is not None:
        scores["face"] = vision.face_score
        active_signals.append("camera")
    else:
        # Redistribute face weight
        weights["voice"] += weights["face"] * 0.6
        weights["content"] += weights["face"] * 0.4
        weights["face"] = 0.0

    if voice is not None:
        scores["voice"] = voice.voice_score
        active_signals.append("microphone")
    else:
        # Redistribute voice weight
        weights["face"] += weights["voice"] * 0.6
        weights["content"] += weights["voice"] * 0.4
        weights["voice"] = 0.0

    # Compute weighted composite (0-100 scale)
    composite = (
        weights["voice"] * scores.get("voice", 0.0)
        + weights["face"] * scores.get("face", 0.0)
        + weights["content"] * scores.get("content", 0.0)
    )

    # Normalize to 0-10 scale
    confidence_10 = round(composite / 10.0, 1)

    # Generate contextual suggestions
    suggestions = _generate_suggestions(vision, voice, content_score)

    # Build result
    eye_label = _classify(vision.eye_contact_score) if vision else "unavailable"
    head_label = _classify_stability(vision.head_stability_score) if vision else "unavailable"
    voice_label = voice.voice_stability if voice else "unavailable"
    engagement_label = vision.engagement_level if vision else (
        "moderate" if voice and voice.voice_score > 50 else "low"
    )

    return MultiModalResult(
        confidence_score=confidence_10,
        eye_contact=eye_label,
        head_movement=head_label,
        voice_stability=voice_label,
        engagement=engagement_label,
        face_score=round(scores.get("face", 0.0), 1),
        voice_score=round(scores.get("voice", 0.0), 1),
        content_score=round(content_score, 1),
        suggestions=suggestions,
        active_signals=active_signals,
    )


def _generate_suggestions(
    vision: Optional[VisionMetrics],
    voice: Optional[VoiceMetrics],
    content_score: float,
) -> List[str]:
    """Generate prioritized, actionable suggestions based on weakest signals."""
    tips: list[str] = []

    if vision is not None:
        if vision.eye_contact_score < 50:
            tips.append("Focus on looking directly at the camera to simulate eye contact with your audience")
        elif vision.eye_contact_score < 70:
            tips.append("Your eye contact is good but inconsistent — try to maintain it for longer stretches")

        if vision.head_stability_score < 50:
            tips.append("Your head movement is distracting — try to keep your head centered and still")
        elif vision.head_stability_score < 70:
            tips.append("Slight head movements detected — minimize unnecessary motion for a more confident appearance")

        if vision.expression_score < 50:
            tips.append("Your facial expression appears tense — try a slight natural smile to appear more approachable")
        elif vision.expression_score < 70:
            tips.append("Maintain a consistent, engaged expression to reinforce your message")

    if voice is not None:
        if voice.energy_score < 50:
            tips.append("Project your voice with more energy — speak as if addressing someone across the room")
        elif voice.energy_score < 70:
            tips.append("Your voice projection is decent but could be stronger for maximum impact")

        if voice.pace_score < 50:
            tips.append("Adjust your speaking pace — aim for 130-170 words per minute for optimal delivery")

        if voice.pause_ratio > 0.4:
            tips.append("You're pausing too frequently — practice flowing between points more smoothly")

    if content_score < 50:
        tips.append("Strengthen your content with specific examples, data, or structured arguments")
    elif content_score < 70:
        tips.append("Good content foundation — add transition words and rhetorical questions for more impact")

    # If everything is great
    if not tips:
        tips.append("Excellent performance across all signals — maintain this level of engagement!")

    return tips[:4]  # Max 4 suggestions to avoid overwhelm


def result_to_dict(result: MultiModalResult) -> dict:
    """Serialize a MultiModalResult for Socket.IO emission."""
    return {
        "confidence_score": result.confidence_score,
        "eye_contact": result.eye_contact,
        "head_movement": result.head_movement,
        "voice_stability": result.voice_stability,
        "engagement": result.engagement,
        "face_score": result.face_score,
        "voice_score": result.voice_score,
        "content_score": result.content_score,
        "suggestions": result.suggestions,
        "active_signals": result.active_signals,
    }
