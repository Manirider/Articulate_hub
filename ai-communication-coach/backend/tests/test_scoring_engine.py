"""Comprehensive unit tests for the scoring engine.

Covers:
- Metric extraction edge cases
- Sentiment analysis boundary conditions
- Scoring formula consistency
- Feedback generation quality
"""

import pytest
from app.services.ai_pipeline.analyzer import (
    AnalysisResult,
    SpeechMetrics,
    analyze_sentiment,
    analyze_transcript,
    extract_metrics,
    _clamp,
    FILLER_WORDS,
    TRANSITION_WORDS,
    POWER_WORDS,
    WEAK_WORDS,
)


class TestClamp:
    """Tests for the _clamp utility function."""

    def test_clamp_within_range(self):
        assert _clamp(50.0) == 50.0

    def test_clamp_below_min(self):
        assert _clamp(-10.0) == 0.0

    def test_clamp_above_max(self):
        assert _clamp(110.0) == 100.0

    def test_clamp_at_boundaries(self):
        assert _clamp(0.0) == 0.0
        assert _clamp(100.0) == 100.0

    def test_clamp_custom_range(self):
        assert _clamp(0.5, 0.0, 1.0) == 0.5
        assert _clamp(-0.1, 0.0, 1.0) == 0.0
        assert _clamp(1.5, 0.0, 1.0) == 1.0

    def test_clamp_rounds_to_two_decimals(self):
        assert _clamp(33.3333) == 33.33
        assert _clamp(66.6666) == 66.67


class TestExtractMetricsEdgeCases:
    """Edge case testing for metric extraction."""

    def test_single_word(self):
        m = extract_metrics("Hello")
        assert m.word_count == 1
        assert m.sentence_count == 1  # max(1, ...)

    def test_only_punctuation(self):
        m = extract_metrics("... !!! ???")
        assert m.word_count == 3
        assert m.filler_count == 0

    def test_all_fillers(self):
        text = "um uh like um uh like"
        m = extract_metrics(text)
        assert m.filler_count >= 4  # at least um(2) + uh(2)

    def test_no_fillers_in_clean_speech(self):
        text = "The data clearly indicates that our approach yields significant improvements."
        m = extract_metrics(text)
        assert m.filler_count == 0

    def test_unique_word_ratio_all_unique(self):
        m = extract_metrics("Every word here is completely unique and different entirely.")
        assert m.unique_word_ratio > 0.8

    def test_unique_word_ratio_repetitive(self):
        m = extract_metrics("test test test test test test test test")
        assert m.unique_word_ratio < 0.3

    def test_wpm_estimate_bounds(self):
        short = extract_metrics("Hello.")
        assert 80 <= short.words_per_minute_estimate <= 200

        long = extract_metrics(" ".join(["word"] * 300))
        assert 80 <= long.words_per_minute_estimate <= 200

    def test_exclamation_detection(self):
        m = extract_metrics("Wow! Amazing! Incredible!")
        assert m.exclamation_count == 3

    def test_multiline_text(self):
        text = "First line.\nSecond line.\nThird line."
        m = extract_metrics(text)
        assert m.sentence_count >= 3
        assert m.word_count >= 6


class TestSentimentEdgeCases:
    """Boundary condition tests for sentiment analysis."""

    def test_neutral_text(self):
        s = analyze_sentiment("The weather is moderate today.")
        # No positive or negative markers
        assert 0 <= s.positivity <= 1

    def test_mixed_sentiment(self):
        s = analyze_sentiment(
            "This is a great success but there is a problem and risk of failure."
        )
        assert 0 <= s.positivity <= 1
        assert 0 <= s.assertiveness <= 1

    def test_empty_text(self):
        s = analyze_sentiment("")
        assert s.stress_indicator == "elevated"  # word_count < 40

    def test_stress_moderate(self):
        text = " ".join(["word"] * 60)
        s = analyze_sentiment(text)
        assert s.stress_indicator == "moderate"


class TestAnalyzeTranscriptConsistency:
    """Tests for scoring formula consistency and output quality."""

    def test_longer_speech_generally_scores_higher_content(self):
        """Longer, substantive speech should score higher on content."""
        short = analyze_transcript("Hello world.")
        long_text = (
            "I believe that artificial intelligence represents a transformative "
            "force in modern education. However, we must carefully consider the "
            "implications. For example, bias in training data can lead to unfair "
            "outcomes. Furthermore, the digital divide means not everyone benefits "
            "equally. In conclusion, we need both innovation and regulation."
        )
        long = analyze_transcript(long_text)
        assert long.content_score > short.content_score

    def test_transition_words_boost_clarity(self):
        """Using transition words should boost clarity score."""
        without = analyze_transcript("AI is important. We need it. It helps people.")
        with_transitions = analyze_transcript(
            "AI is important. However, challenges remain. Therefore, we need careful planning. "
            "Moreover, ethical considerations are essential. Furthermore, regulation is crucial."
        )
        assert with_transitions.clarity_score >= without.clarity_score

    def test_power_words_boost_confidence(self):
        """Using power words should boost confidence score."""
        weak = analyze_transcript("Maybe it might be kind of sort of important I guess.")
        strong = analyze_transcript(
            "This is a crucial and significant development. It represents a "
            "fundamental shift in how we approach essential problems. The impact "
            "is truly remarkable and transformative."
        )
        assert strong.confidence_score > weak.confidence_score

    def test_feedback_arrays_always_populated(self):
        """Strengths, weaknesses, improvements must never be empty."""
        texts = [
            "Short.",
            "This is a medium-length text about communication.",
            " ".join(["word"] * 200),
        ]
        for text in texts:
            result = analyze_transcript(text)
            assert len(result.strengths) >= 1
            assert len(result.weaknesses) >= 1
            assert len(result.improvements) >= 1

    def test_explainability_references_actual_metrics(self):
        """Explainability string must contain real measured values."""
        result = analyze_transcript(
            "Hello world. This is a test. We should consider the implications."
        )
        expl = result.explainability
        # Must reference word count
        assert "word" in expl.lower()
        # Must reference actual numbers
        assert any(char.isdigit() for char in expl)

    def test_overall_score_is_average_of_components(self):
        """Overall score must be the mean of the four component scores."""
        result = analyze_transcript(
            "Communication is crucial. However, we need practice. "
            "For example, daily training helps build confidence."
        )
        expected = round(
            (result.clarity_score + result.confidence_score +
             result.content_score + result.delivery_score) / 4,
            2
        )
        assert abs(result.overall_score - expected) < 0.01

    def test_result_contains_metrics_dict(self):
        """Result must contain a metrics dictionary with all expected keys."""
        result = analyze_transcript("Testing the metrics output.")
        expected_keys = {
            "word_count", "sentence_count", "filler_count",
            "transition_count", "power_word_count", "weak_word_count",
            "unique_word_ratio",
        }
        assert expected_keys.issubset(result.metrics.keys())

    def test_result_contains_sentiment_dict(self):
        """Result must contain sentiment analysis data."""
        result = analyze_transcript("A great success with many advantages.")
        expected_keys = {"positivity", "assertiveness", "stress"}
        assert expected_keys.issubset(result.sentiment.keys())

