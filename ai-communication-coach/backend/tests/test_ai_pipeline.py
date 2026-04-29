"""Unit tests for the NLP analyzer and multi-agent pipeline."""

import pytest

from app.services.ai_pipeline.analyzer import (
    AnalysisResult,
    SpeechMetrics,
    analyze_sentiment,
    analyze_transcript,
    extract_metrics,
)


class TestExtractMetrics:
    def test_empty_text(self):
        m = extract_metrics("")
        assert m.word_count == 0
        assert m.filler_count == 0

    def test_basic_counting(self):
        m = extract_metrics("Hello world. This is a test.")
        assert m.word_count == 6
        assert m.sentence_count == 2
        assert m.avg_sentence_length == 3.0

    def test_filler_detection(self):
        m = extract_metrics("So um like you know I basically think um it is um actually important.")
        assert m.filler_count >= 4  # um(3) + like + you know + basically + actually

    def test_transition_detection(self):
        text = "However, the situation is complex. Therefore we need to act. Moreover, data shows improvement."
        m = extract_metrics(text)
        assert m.transition_count >= 3

    def test_power_word_detection(self):
        text = "This is a crucial and significant change that is essential for our future."
        m = extract_metrics(text)
        assert m.power_word_count >= 3

    def test_question_detection(self):
        m = extract_metrics("What is AI? Can we trust it? How does it work?")
        assert m.question_count == 3


class TestAnalyzeSentiment:
    def test_positive_sentiment(self):
        s = analyze_sentiment("This is a great success. Excellent progress with many advantages.")
        assert s.positivity > 0.5

    def test_negative_sentiment(self):
        s = analyze_sentiment("This is a major problem. The risk of failure is a serious concern.")
        assert s.positivity < 0.5

    def test_stress_low(self):
        text = " ".join(["word"] * 120)
        s = analyze_sentiment(text)
        assert s.stress_indicator == "low"

    def test_stress_elevated(self):
        s = analyze_sentiment("Short text.")
        assert s.stress_indicator == "elevated"


class TestAnalyzeTranscript:
    def test_empty_transcript(self):
        result = analyze_transcript("")
        assert result.overall_score == 0.0
        assert "No speech captured" in result.strengths[0]

    def test_short_transcript(self):
        result = analyze_transcript("Hello world I think um this is good.")
        assert 0 <= result.overall_score <= 100
        assert result.clarity_score >= 0
        assert result.confidence_score >= 0

    def test_high_quality_transcript(self):
        text = (
            "I believe artificial intelligence will fundamentally transform education. "
            "However, we must carefully consider the ethical implications. "
            "For example, personalized learning could dramatically help students "
            "who struggle with traditional methods. Furthermore, adaptive systems "
            "can identify crucial knowledge gaps early. The essential question remains: "
            "how do we ensure significant and equitable access to these remarkable "
            "technologies? In conclusion, the strategic deployment of AI in education "
            "represents a transformative opportunity that demands our immediate attention."
        )
        result = analyze_transcript(text)
        assert result.overall_score > 55  # Quality text should score decently
        assert len(result.strengths) >= 1
        assert result.explainability  # Should have explanation

    def test_filler_heavy_transcript(self):
        text = "Um so like um you know I basically um think um like basically um it's um actually um yeah."
        result = analyze_transcript(text)
        # Filler-heavy text should score lower
        assert result.confidence_score < 60

    def test_metrics_in_result(self):
        result = analyze_transcript("Hello world. This is a test statement.")
        assert "word_count" in result.metrics
        assert "filler_count" in result.metrics

    def test_sentiment_in_result(self):
        result = analyze_transcript("This is a great success and advantage.")
        assert "positivity" in result.sentiment
        assert "assertiveness" in result.sentiment

    def test_scores_are_clamped(self):
        result = analyze_transcript("test " * 500)
        assert 0 <= result.clarity_score <= 100
        assert 0 <= result.confidence_score <= 100
        assert 0 <= result.content_score <= 100
        assert 0 <= result.delivery_score <= 100
        assert 0 <= result.overall_score <= 100


@pytest.mark.asyncio
async def test_multi_agent_pipeline():
    from app.services.agents.orchestrator import run_multi_agent_pipeline

    text = (
        "The impact of technology on communication is significant. "
        "However, we must balance innovation with human connection. "
        "For example, video calls have replaced many face-to-face meetings."
    )

    result = await run_multi_agent_pipeline(text)

    assert "conversation" in result
    assert "observer" in result
    assert "analysis" in result
    assert "feedback" in result
    assert "psychology" in result

    # Conversation agent
    assert "response_prompt" in result["conversation"]
    assert len(result["conversation"]["response_prompt"]) > 10

    # Observer agent
    assert "observations" in result["observer"]
    assert len(result["observer"]["observations"]) >= 1
    assert "behavioral_tip" in result["observer"]

    # Evaluation agent
    analysis = result["analysis"]
    assert isinstance(analysis, AnalysisResult)
    assert 0 <= analysis.overall_score <= 100

    # Feedback agent
    feedback = result["feedback"]
    assert "strengths" in feedback
    assert "weaknesses" in feedback
    assert "improvements" in feedback
    assert "coaching_insights" in feedback

    # Psychology agent
    psych = result["psychology"]
    assert "stress_indicator" in psych
    assert "emotional_tone" in psych
    assert "mindset_tips" in psych
    assert len(psych["mindset_tips"]) >= 1
