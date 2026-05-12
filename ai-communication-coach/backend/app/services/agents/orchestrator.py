"""
Multi-Agent AI Pipeline Orchestrator

Five specialized agents collaborate asynchronously to analyze communication sessions:
  - Conversation Agent: Generates contextual AI responses and follow-up prompts
  - Observer Agent: Behavioral analysis (fillers, pacing, eye contact notes)
  - Evaluation Agent: Quantitative scoring using the NLP analyzer
  - Feedback Agent: Transforms scores into actionable coaching insights
  - Psychology Agent: Sentiment, stress, and mindset analysis

Production hardening includes:
  - Structured logging for each agent
  - Per-agent timeout enforcement
  - Retry logic with exponential backoff for LLM calls
  - Language-aware prompt generation
  - Observability via OpenTelemetry tracing
"""

import asyncio
import logging
import os
import json
import random
import time
from functools import wraps
from typing import Any

from openai import AsyncOpenAI

from app.services.ai_pipeline.analyzer import (
    AnalysisResult,
    analyze_transcript,
    extract_metrics,
    analyze_sentiment,
)
from app.core.languages import get_ai_prompt_locale, DEFAULT_LANGUAGE

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

AGENT_TIMEOUT_SECONDS = 30
MAX_RETRIES = 3
RETRY_BASE_DELAY = 0.5  # seconds


# ── Retry decorator for LLM calls ───────────────────────────────────────────

def retry_with_backoff(max_retries: int = MAX_RETRIES, base_delay: float = RETRY_BASE_DELAY):
    """Decorator that retries an async function with exponential backoff."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(1, max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        delay = base_delay * (2 ** (attempt - 1)) + random.uniform(0, 0.5)
                        logger.warning(
                            "Agent %s attempt %d/%d failed: %s. Retrying in %.1fs",
                            func.__name__, attempt, max_retries, str(e), delay,
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            "Agent %s exhausted all %d retries. Last error: %s",
                            func.__name__, max_retries, str(e),
                        )
            raise last_exception  # type: ignore[misc]
        return wrapper
    return decorator


from app.core.telemetry import trace_span

# ── Conversation Agent ───────────────────────────────────────────────────────

@trace_span("agent.conversation")
async def conversation_agent(
    transcript: str,
    module_name: str = "",
    language: str | None = None,
) -> dict[str, Any]:
    """Generates a contextual follow-up prompt for the AI avatar to speak."""
    start = time.monotonic()
    await asyncio.sleep(0)

    locale = get_ai_prompt_locale(language)
    metrics = extract_metrics(transcript)
    word_count = metrics.word_count

    prompts_by_context = {
        "short": [
            "You've made a good start. Can you expand on your main point with a specific example?",
            "That's interesting. What evidence supports your position?",
            "Try building on that idea. What would a counterargument look like?",
        ],
        "medium": [
            "Strong points so far. Can you connect your ideas with a concrete case study?",
            "You're building momentum. Try summarizing your key argument in one sentence.",
            "Good depth. Now add a transition to link your ideas more cohesively.",
        ],
        "long": [
            "Excellent coverage. Time to craft your concluding statement — what's the one insight you want the audience to remember?",
            "You've covered a lot of ground. Try strengthening your weakest argument with data.",
            "Great engagement. Consider addressing potential counterpoints before closing.",
        ],
    }

    if word_count < 50:
        pool = prompts_by_context["short"]
    elif word_count < 150:
        pool = prompts_by_context["medium"]
    else:
        pool = prompts_by_context["long"]

    elapsed = time.monotonic() - start
    logger.debug("conversation_agent completed in %.3fs (lang=%s)", elapsed, locale)

    return {
        "response_prompt": random.choice(pool),
        "word_count_context": word_count,
        "language": locale,
    }


# ── Observer Agent ───────────────────────────────────────────────────────────

@trace_span("agent.observer")
async def observer_agent(transcript: str) -> dict[str, Any]:
    """Behavioral observation: filler detection, pacing notes, engagement markers."""
    start = time.monotonic()
    await asyncio.sleep(0)

    metrics = extract_metrics(transcript)
    observations: list[str] = []

    if metrics.filler_count > 5:
        observations.append(f"Notice: {metrics.filler_count} filler words detected. Try replacing them with strategic pauses.")
    elif metrics.filler_count > 2:
        observations.append(f"Minor filler usage ({metrics.filler_count}). You're doing well — reduce them further in practice.")
    else:
        observations.append("Excellent! Minimal filler word usage detected.")

    if metrics.avg_sentence_length > 25:
        observations.append("Some sentences are quite long. Break them into shorter, punchier statements.")
    elif metrics.avg_sentence_length < 8:
        observations.append("Sentences are very short. Try connecting ideas with transition phrases.")

    if metrics.transition_count >= 3:
        observations.append("Good logical flow — your use of transition words helps the audience follow along.")
    elif metrics.transition_count == 0:
        observations.append("Consider adding transition words (however, therefore, for example) to improve flow.")

    if metrics.question_count > 0:
        observations.append("Good engagement technique — using questions draws the audience in.")

    elapsed = time.monotonic() - start
    logger.debug("observer_agent completed in %.3fs", elapsed)

    return {
        "observations": observations,
        "filler_count": metrics.filler_count,
        "avg_sentence_length": round(metrics.avg_sentence_length, 1),
        "behavioral_tip": "Maintain eye contact, use hand gestures sparingly, and project your voice with conviction.",
    }


# ── Evaluation Agent ─────────────────────────────────────────────────────────

@trace_span("agent.evaluation")
async def evaluation_agent(transcript: str) -> AnalysisResult:
    """Quantitative scoring via the NLP analyzer pipeline."""
    start = time.monotonic()
    await asyncio.sleep(0)
    result = analyze_transcript(transcript)
    elapsed = time.monotonic() - start
    logger.debug("evaluation_agent completed in %.3fs", elapsed)
    return result


# ── Feedback Agent ───────────────────────────────────────────────────────────

@trace_span("agent.feedback.llm_call")
@retry_with_backoff(max_retries=MAX_RETRIES)
async def _call_llm_for_feedback(transcript: str, analysis: AnalysisResult, language: str) -> dict[str, Any]:
    """Internal LLM call with retry logic."""
    ollama_url = os.getenv("OLLAMA_BASE_URL")
    if not ollama_url:
        raise ConnectionError("No LLM backend configured")

    client = AsyncOpenAI(base_url=f"{ollama_url}/v1", api_key="ollama", timeout=30.0)
    prompt = (
        f"Analyze this speech transcript in {language}: '{transcript}'. "
        f"The calculated scores are Clarity: {analysis.clarity_score}, "
        f"Confidence: {analysis.confidence_score}, Content: {analysis.content_score}, "
        f"Delivery: {analysis.delivery_score}. Provide JSON output with keys "
        f"'strengths', 'weaknesses', 'improvements', and 'coaching_insights', "
        f"each containing a list of short string tips."
    )

    response = await client.chat.completions.create(
        model="llama3.2",
        messages=[
            {"role": "system", "content": f"You are an expert communication coach. Respond in {language}. Output valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )

    if response.choices and response.choices[0].message.content:
        return json.loads(response.choices[0].message.content)
    raise ValueError("Empty LLM response")


@trace_span("agent.feedback")
async def feedback_agent(
    analysis: AnalysisResult,
    transcript: str,
    language: str | None = None,
) -> dict[str, Any]:
    """Transforms analysis scores into structured coaching feedback, using Ollama if available."""
    start = time.monotonic()
    locale = get_ai_prompt_locale(language)

    try:
        data = await asyncio.wait_for(
            _call_llm_for_feedback(transcript, analysis, locale),
            timeout=AGENT_TIMEOUT_SECONDS,
        )
        elapsed = time.monotonic() - start
        logger.info("feedback_agent (LLM) completed in %.3fs", elapsed)
        return {
            "strengths": data.get("strengths", analysis.strengths),
            "weaknesses": data.get("weaknesses", analysis.weaknesses),
            "improvements": data.get("improvements", analysis.improvements),
            "coaching_insights": data.get("coaching_insights", []),
        }
    except (ConnectionError, asyncio.TimeoutError, Exception) as e:
        elapsed = time.monotonic() - start
        logger.warning("feedback_agent falling back to demo mode after %.3fs: %s", elapsed, str(e))
        return {
            "strengths": ["[Demo Mode] Clear voice detected"],
            "weaknesses": ["[Demo Mode] Advanced AI coaching requires an API Key"],
            "improvements": [f"[Demo Mode] Service unavailable: {str(e)}"],
            "coaching_insights": ["[Demo Mode] AI analysis is currently unavailable"],
            "is_demo_mode": True,
        }


# ── Psychology Agent ─────────────────────────────────────────────────────────

@trace_span("agent.psychology")
async def psychology_agent(transcript: str) -> dict[str, Any]:
    """Analyzes emotional tone, stress indicators, and provides mindset coaching."""
    start = time.monotonic()
    await asyncio.sleep(0)

    sentiment = analyze_sentiment(transcript)
    metrics = extract_metrics(transcript)

    mindset_tips: list[str] = []

    if sentiment.stress_indicator == "elevated":
        mindset_tips.append("Take a deep breath before each point. Anxiety is normal and manageable.")
        mindset_tips.append("Remember: practice is for growth, not perfection.")
    elif sentiment.stress_indicator == "moderate":
        mindset_tips.append("You're in a good zone. Use a 2-second pause before key transitions to project calm authority.")
    else:
        mindset_tips.append("Excellent composure! Your calm delivery enhances credibility. Maintain this energy.")

    if sentiment.positivity < 0.4:
        mindset_tips.append("Try incorporating more positive framing. Instead of 'this is a problem,' try 'this is an opportunity.'")

    if sentiment.assertiveness < 0.5:
        mindset_tips.append("Your tone tends toward tentative. Practice stating opinions as facts: 'This is important' vs 'I think this might be important.'")

    emotion_label = "confident" if sentiment.assertiveness > 0.6 else ("balanced" if sentiment.assertiveness > 0.4 else "cautious")

    elapsed = time.monotonic() - start
    logger.debug("psychology_agent completed in %.3fs", elapsed)

    return {
        "stress_indicator": sentiment.stress_indicator,
        "emotional_tone": emotion_label,
        "positivity": sentiment.positivity,
        "assertiveness": sentiment.assertiveness,
        "mindset_tips": mindset_tips,
    }


# ── Orchestrator ─────────────────────────────────────────────────────────────

@trace_span("orchestrator.pipeline")
async def run_multi_agent_pipeline(
    transcript: str,
    module_name: str = "",
    language: str | None = None,
) -> dict[str, Any]:
    """Runs all 5 agents concurrently with timeout enforcement and assembles the composite result."""
    pipeline_start = time.monotonic()
    logger.info("Starting multi-agent pipeline (module=%s, language=%s)", module_name, language)

    try:
        convo, observer, analysis, psych = await asyncio.wait_for(
            asyncio.gather(
                conversation_agent(transcript, module_name, language),
                observer_agent(transcript),
                evaluation_agent(transcript),
                psychology_agent(transcript),
            ),
            timeout=AGENT_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.error("Multi-agent pipeline timed out after %ds", AGENT_TIMEOUT_SECONDS)
        raise

    # Feedback agent depends on evaluation results, run sequentially
    feedback = await feedback_agent(analysis, transcript, language)

    elapsed = time.monotonic() - pipeline_start
    logger.info("Multi-agent pipeline completed in %.3fs", elapsed)

    return {
        "conversation": convo,
        "observer": observer,
        "analysis": analysis,
        "feedback": feedback,
        "psychology": psych,
        "pipeline_latency_ms": round(elapsed * 1000, 1),
    }
