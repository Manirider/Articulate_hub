"""Tests for the multi-agent orchestrator and individual agents.

Covers:
- Each agent independently
- Orchestrator assembly
- Demo mode detection
- Edge cases (empty transcript, massive text)
"""

import pytest
from unittest.mock import patch, AsyncMock

from app.services.agents.orchestrator import (
    conversation_agent,
    observer_agent,
    evaluation_agent,
    feedback_agent,
    psychology_agent,
    run_multi_agent_pipeline,
)
from app.services.ai_pipeline.analyzer import AnalysisResult


class TestConversationAgent:
    """Tests for the conversation agent."""

    @pytest.mark.asyncio
    async def test_short_transcript_prompts(self):
        result = await conversation_agent("Hello world", "Debate")
        assert "response_prompt" in result
        assert len(result["response_prompt"]) > 10
        assert result["word_count_context"] == 2

    @pytest.mark.asyncio
    async def test_medium_transcript_prompts(self):
        text = " ".join(["Communication is important."] * 15)  # ~45 words
        result = await conversation_agent(text)
        assert "response_prompt" in result
        assert result["word_count_context"] > 40

    @pytest.mark.asyncio
    async def test_long_transcript_prompts(self):
        text = " ".join(["This is a comprehensive argument about AI ethics."] * 25)
        result = await conversation_agent(text)
        assert "response_prompt" in result
        assert result["word_count_context"] > 150


class TestObserverAgent:
    """Tests for the observer agent."""

    @pytest.mark.asyncio
    async def test_high_filler_observation(self):
        text = "Um like um you know um basically um I think um it's um like um yeah um right"
        result = await observer_agent(text)
        assert "observations" in result
        assert result["filler_count"] > 5
        # Should mention filler detection
        assert any("filler" in obs.lower() for obs in result["observations"])

    @pytest.mark.asyncio
    async def test_low_filler_observation(self):
        text = "The impact of technology on society is profound and far-reaching."
        result = await observer_agent(text)
        assert result["filler_count"] == 0
        assert any("excellent" in obs.lower() or "minimal" in obs.lower()
                    for obs in result["observations"])

    @pytest.mark.asyncio
    async def test_behavioral_tip_always_present(self):
        result = await observer_agent("Any text here.")
        assert "behavioral_tip" in result
        assert len(result["behavioral_tip"]) > 10

    @pytest.mark.asyncio
    async def test_long_sentences_flagged(self):
        text = " ".join(["word"] * 100) + "."  # 100 words, 1 sentence
        result = await observer_agent(text)
        assert result["avg_sentence_length"] > 25

    @pytest.mark.asyncio
    async def test_question_engagement_detected(self):
        text = "What do you think? Why is this important?"
        result = await observer_agent(text)
        assert any("question" in obs.lower() or "engagement" in obs.lower()
                    for obs in result["observations"])


class TestEvaluationAgent:
    """Tests for the evaluation agent."""

    @pytest.mark.asyncio
    async def test_returns_analysis_result(self):
        result = await evaluation_agent("This is a test of the evaluation system.")
        assert isinstance(result, AnalysisResult)
        assert 0 <= result.overall_score <= 100

    @pytest.mark.asyncio
    async def test_empty_transcript(self):
        result = await evaluation_agent("")
        assert result.overall_score == 0.0


class TestFeedbackAgent:
    """Tests for the feedback agent."""

    @pytest.mark.asyncio
    async def test_demo_mode_when_no_ai(self):
        """When no AI is configured, feedback should indicate Demo Mode."""
        analysis = AnalysisResult(
            clarity_score=50, confidence_score=50,
            content_score=50, delivery_score=50,
            overall_score=50,
            strengths=["Test"], weaknesses=["Test"], improvements=["Test"],
            explainability="Test", metrics={}, sentiment={},
        )

        # Ensure no OLLAMA_BASE_URL is set
        with patch.dict("os.environ", {"OLLAMA_BASE_URL": ""}, clear=False):
            result = await feedback_agent(analysis, "test transcript")
            assert result["is_demo_mode"] is True
            assert any("[Demo Mode]" in s for s in result["strengths"])

    @pytest.mark.asyncio
    async def test_feedback_has_required_keys(self):
        analysis = AnalysisResult(
            clarity_score=70, confidence_score=75,
            content_score=65, delivery_score=60,
            overall_score=67.5,
            strengths=["Good"], weaknesses=["Needs work"],
            improvements=["Practice"], explainability="Based on 50 words.",
            metrics={}, sentiment={},
        )

        with patch.dict("os.environ", {"OLLAMA_BASE_URL": ""}, clear=False):
            result = await feedback_agent(analysis, "test")
            assert "strengths" in result
            assert "weaknesses" in result
            assert "improvements" in result
            assert "coaching_insights" in result


class TestPsychologyAgent:
    """Tests for the psychology agent."""

    @pytest.mark.asyncio
    async def test_stress_detection_short_text(self):
        result = await psychology_agent("Short.")
        assert result["stress_indicator"] == "elevated"
        assert len(result["mindset_tips"]) >= 1

    @pytest.mark.asyncio
    async def test_stress_detection_long_text(self):
        text = " ".join(["Communication is important."] * 30)
        result = await psychology_agent(text)
        assert result["stress_indicator"] == "moderate"

    @pytest.mark.asyncio
    async def test_emotional_tone_labels(self):
        result = await psychology_agent("A confident assertion about important topics.")
        assert result["emotional_tone"] in ("confident", "balanced", "cautious")

    @pytest.mark.asyncio
    async def test_assertiveness_score(self):
        result = await psychology_agent("Testing assertiveness scoring.")
        assert 0 <= result["assertiveness"] <= 1

    @pytest.mark.asyncio
    async def test_positivity_score(self):
        result = await psychology_agent("Great success with excellent advantages!")
        assert 0 <= result["positivity"] <= 1


class TestOrchestratorPipeline:
    """Tests for the full multi-agent orchestrator."""

    @pytest.mark.asyncio
    async def test_all_agents_present_in_output(self):
        result = await run_multi_agent_pipeline(
            "AI has significant implications for education. However, challenges remain.",
            "Presentation"
        )

        assert "conversation" in result
        assert "observer" in result
        assert "analysis" in result
        assert "feedback" in result
        assert "psychology" in result

    @pytest.mark.asyncio
    async def test_empty_transcript_pipeline(self):
        result = await run_multi_agent_pipeline("")

        assert result["analysis"].overall_score == 0.0
        assert "conversation" in result
        assert "observer" in result

    @pytest.mark.asyncio
    async def test_pipeline_with_module_name(self):
        result = await run_multi_agent_pipeline(
            "Testing with module name parameter.",
            "Group Discussion"
        )
        assert result["conversation"]["word_count_context"] > 0
