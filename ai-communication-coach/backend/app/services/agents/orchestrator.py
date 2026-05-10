"""
Multi-Agent AI Pipeline Orchestrator

Five specialized agents collaborate asynchronously to analyze communication sessions:
  - Conversation Agent: Generates contextual AI responses and follow-up prompts
  - Observer Agent: Behavioral analysis (fillers, pacing, eye contact notes)
  - Evaluation Agent: Quantitative scoring using the NLP analyzer
  - Feedback Agent: Transforms scores into actionable coaching insights
  - Psychology Agent: Sentiment, stress, and mindset analysis
"""

import asyncio
import random

from app.services.ai_pipeline.analyzer import AnalysisResult, analyze_transcript, extract_metrics, analyze_sentiment


# ─── Conversation Agent ─────────────────────────────────────────────────────
async def conversation_agent(transcript: str, module_name: str = "") -> dict:
    """Generates a contextual follow-up prompt for the AI avatar to speak."""
    await asyncio.sleep(0)  # Simulate async processing

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

    return {
        "response_prompt": random.choice(pool),
        "word_count_context": word_count,
    }


# ─── Observer Agent ──────────────────────────────────────────────────────────
async def observer_agent(transcript: str) -> dict:
    """Behavioral observation: filler detection, pacing notes, engagement markers."""
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

    return {
        "observations": observations,
        "filler_count": metrics.filler_count,
        "avg_sentence_length": round(metrics.avg_sentence_length, 1),
        "behavioral_tip": "Maintain eye contact, use hand gestures sparingly, and project your voice with conviction."
    }


# ─── Evaluation Agent ────────────────────────────────────────────────────────
async def evaluation_agent(transcript: str) -> AnalysisResult:
    """Quantitative scoring via the NLP analyzer pipeline."""
    await asyncio.sleep(0)
    return analyze_transcript(transcript)


import os
import json
from openai import AsyncOpenAI

# ─── Feedback Agent ──────────────────────────────────────────────────────────
async def feedback_agent(analysis: AnalysisResult, transcript: str) -> dict:
    """Transforms analysis scores into structured coaching feedback, using Ollama if available."""
    ollama_url = os.getenv("OLLAMA_BASE_URL")
    if ollama_url:
        try:
            client = AsyncOpenAI(base_url=f"{ollama_url}/v1", api_key="ollama", timeout=30.0)
            prompt = f"Analyze this speech transcript: '{transcript}'. The calculated scores are Clarity: {analysis.clarity_score}, Confidence: {analysis.confidence_score}, Content: {analysis.content_score}, Delivery: {analysis.delivery_score}. Provide JSON output with keys 'strengths', 'weaknesses', 'improvements', and 'coaching_insights', each containing a list of short string tips."
            
            response = await client.chat.completions.create(
                model="llama3.2",
                messages=[
                    {"role": "system", "content": "You are an expert communication coach. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            if response.choices and response.choices[0].message.content:
                data = json.loads(response.choices[0].message.content)
                return {
                    "strengths": data.get("strengths", analysis.strengths),
                    "weaknesses": data.get("weaknesses", analysis.weaknesses),
                    "improvements": data.get("improvements", analysis.improvements),
                    "coaching_insights": data.get("coaching_insights", []),
                }
        except Exception as e:
            raise RuntimeError(f"AI feedback generation failed: {e}. Ollama service unavailable.") from e

    # No fallback - AI is required for quality coaching
    raise RuntimeError("AI feedback generation unavailable. OLLAMA_BASE_URL not configured or service unreachable.")


# ─── Psychology Agent ────────────────────────────────────────────────────────
async def psychology_agent(transcript: str) -> dict:
    """Analyzes emotional tone, stress indicators, and provides mindset coaching."""
    await asyncio.sleep(0)

    sentiment = analyze_sentiment(transcript)
    metrics = extract_metrics(transcript)

    # Adaptive mindset tips based on analysis
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

    return {
        "stress_indicator": sentiment.stress_indicator,
        "emotional_tone": emotion_label,
        "positivity": sentiment.positivity,
        "assertiveness": sentiment.assertiveness,
        "mindset_tips": mindset_tips,
    }


# ─── Orchestrator ────────────────────────────────────────────────────────────
async def run_multi_agent_pipeline(transcript: str, module_name: str = "") -> dict:
    """Runs all 5 agents concurrently and assembles the composite result."""

    convo_task = asyncio.create_task(conversation_agent(transcript, module_name))
    observer_task = asyncio.create_task(observer_agent(transcript))
    eval_task = asyncio.create_task(evaluation_agent(transcript))
    psych_task = asyncio.create_task(psychology_agent(transcript))

    convo, observer, analysis, psych = await asyncio.gather(
        convo_task, observer_task, eval_task, psych_task
    )

    feedback = await feedback_agent(analysis, transcript)

    return {
        "conversation": convo,
        "observer": observer,
        "analysis": analysis,
        "feedback": feedback,
        "psychology": psych,
    }
