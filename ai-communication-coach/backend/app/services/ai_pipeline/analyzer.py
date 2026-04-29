import re
from dataclasses import dataclass, field

FILLER_WORDS = {"um", "uh", "like", "you know", "basically", "actually", "honestly", "literally", "right", "so yeah", "I mean"}

TRANSITION_WORDS = {"however", "therefore", "moreover", "furthermore", "consequently", "nevertheless",
                    "in addition", "on the other hand", "for example", "in conclusion", "firstly", "secondly"}

POWER_WORDS = {"crucial", "significant", "essential", "critical", "fundamental", "remarkable",
               "compelling", "innovative", "strategic", "transformative", "impactful"}

WEAK_WORDS = {"maybe", "kind of", "sort of", "I think", "I guess", "probably", "might", "just"}


@dataclass
class SpeechMetrics:
    word_count: int = 0
    sentence_count: int = 0
    avg_sentence_length: float = 0
    unique_word_ratio: float = 0
    filler_count: int = 0
    filler_ratio: float = 0
    transition_count: int = 0
    power_word_count: int = 0
    weak_word_count: int = 0
    question_count: int = 0
    exclamation_count: int = 0
    words_per_minute_estimate: float = 0


@dataclass
class SentimentResult:
    positivity: float = 0.5
    assertiveness: float = 0.5
    stress_indicator: str = "low"


@dataclass
class AnalysisResult:
    clarity_score: float
    confidence_score: float
    content_score: float
    delivery_score: float
    overall_score: float
    strengths: list[str]
    weaknesses: list[str]
    improvements: list[str]
    explainability: str
    metrics: dict = field(default_factory=dict)
    sentiment: dict = field(default_factory=dict)


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, round(value, 2)))


def extract_metrics(transcript: str) -> SpeechMetrics:
    words = transcript.split()
    word_count = len(words)
    if word_count == 0:
        return SpeechMetrics()

    lower_text = transcript.lower()
    sentence_count = max(1, transcript.count(".") + transcript.count("!") + transcript.count("?"))
    avg_sentence_length = word_count / sentence_count

    unique_words = set(w.lower().strip(".,!?;:\"'()") for w in words)
    unique_ratio = len(unique_words) / max(word_count, 1)

    filler_count = sum(lower_text.count(filler) for filler in FILLER_WORDS)
    filler_ratio = filler_count / max(word_count, 1)

    transition_count = sum(1 for tw in TRANSITION_WORDS if tw in lower_text)
    power_count = sum(1 for pw in POWER_WORDS if pw in lower_text)
    weak_count = sum(1 for ww in WEAK_WORDS if ww in lower_text)

    question_count = transcript.count("?")
    exclamation_count = transcript.count("!")

    # Rough WPM estimate: assume 1 minute for every 150 words of sample
    wpm = min(200, max(80, word_count * (150 / max(word_count, 1))))

    return SpeechMetrics(
        word_count=word_count,
        sentence_count=sentence_count,
        avg_sentence_length=avg_sentence_length,
        unique_word_ratio=round(unique_ratio, 3),
        filler_count=filler_count,
        filler_ratio=round(filler_ratio, 3),
        transition_count=transition_count,
        power_word_count=power_count,
        weak_word_count=weak_count,
        question_count=question_count,
        exclamation_count=exclamation_count,
        words_per_minute_estimate=round(wpm, 1),
    )


def analyze_sentiment(transcript: str) -> SentimentResult:
    lower = transcript.lower()
    positive_markers = ["great", "excellent", "important", "benefit", "advantage", "success", "agree", "support"]
    negative_markers = ["problem", "issue", "concern", "disagree", "failure", "challenge", "risk", "unfortunately"]

    pos = sum(lower.count(m) for m in positive_markers)
    neg = sum(lower.count(m) for m in negative_markers)
    total = max(pos + neg, 1)

    positivity = round(pos / total, 2)
    assertiveness = _clamp(0.5 + (pos - neg) * 0.1, 0, 1)

    word_count = len(transcript.split())
    stress = "low" if word_count > 100 else ("moderate" if word_count > 40 else "elevated")

    return SentimentResult(positivity=positivity, assertiveness=assertiveness, stress_indicator=stress)


def analyze_transcript(transcript: str) -> AnalysisResult:
    words = transcript.split()
    word_count = len(words)

    if word_count == 0:
        return AnalysisResult(
            clarity_score=0, confidence_score=0, content_score=0, delivery_score=0, overall_score=0,
            strengths=["No speech captured yet"],
            weaknesses=["No analyzable transcript"],
            improvements=["Speak for at least 30-60 seconds with a clear structure"],
            explainability="Scores require sufficient language evidence.",
        )

    metrics = extract_metrics(transcript)
    sentiment = analyze_sentiment(transcript)

    # --- CLARITY SCORING ---
    # Rewards: unique vocabulary, transitions, and low fillers
    clarity = 50
    clarity += metrics.unique_word_ratio * 30          # Lexical diversity bonus
    clarity += min(metrics.transition_count, 5) * 3     # Structured argument bonus (max 15)
    clarity -= metrics.filler_ratio * 80                # Filler penalty
    clarity -= max(0, metrics.avg_sentence_length - 22) * 1.5  # Overly complex sentence penalty

    # --- CONFIDENCE SCORING ---
    # Rewards: length, power words; Penalizes: weak words, fillers
    confidence = 45
    confidence += min(word_count / 200, 1) * 25        # Speech length suggests engagement
    confidence += min(metrics.power_word_count, 5) * 3  # Assertive language bonus
    confidence -= min(metrics.weak_word_count, 5) * 3   # Hedging penalty
    confidence -= metrics.filler_ratio * 50             # Filler penalty
    confidence += sentiment.assertiveness * 10           # Assertiveness boost

    # --- CONTENT SCORING ---
    # Rewards: depth, vocabulary, rhetorical questions
    content = 40
    content += min(word_count / 250, 1) * 25           # Depth
    content += metrics.unique_word_ratio * 20            # Range of ideas
    content += min(metrics.question_count, 3) * 3        # Engagement via questions
    content += min(metrics.transition_count, 5) * 3      # Logical flow
    content += min(metrics.power_word_count, 3) * 2      # Impact language

    # --- DELIVERY SCORING ---
    # Rewards: balanced pacing
    delivery = 55
    delivery -= abs(metrics.avg_sentence_length - 16) * 1.3   # Ideal ~16 words/sentence
    delivery -= metrics.filler_ratio * 60
    delivery += min(metrics.exclamation_count, 2) * 2          # Enthusiasm marker
    delivery += sentiment.positivity * 8                       # Positive energy

    clarity = _clamp(clarity)
    confidence = _clamp(confidence)
    content = _clamp(content)
    delivery = _clamp(delivery)
    overall = round((clarity + confidence + content + delivery) / 4, 2)

    # --- FEEDBACK GENERATION ---
    strengths: list[str] = []
    weaknesses: list[str] = []
    improvements: list[str] = []

    if clarity >= 70:
        strengths.append("Clear communication with strong lexical variety and logical flow")
    else:
        weaknesses.append("Message clarity could be improved with better structure")
        improvements.append("Use signposted structure: opening hook, 2-3 key points, strong close")

    if confidence >= 70:
        strengths.append("Confident tone with assertive language and sustained engagement")
    else:
        weaknesses.append("Confidence signals are inconsistent — hedging language detected")
        improvements.append("Replace hedge words (maybe, kind of) with definitive statements")

    if content >= 70:
        strengths.append("Rich content depth with diverse vocabulary and good evidence")
    else:
        weaknesses.append("Content lacks depth or supporting evidence")
        improvements.append("Add specific examples, statistics, or case studies to strengthen arguments")

    if delivery >= 70:
        strengths.append("Well-paced delivery with balanced sentence rhythm")
    else:
        weaknesses.append("Delivery rhythm needs improvement — pacing inconsistencies detected")
        improvements.append("Target 12-18 words per sentence. Use strategic pauses between key points")

    if metrics.filler_count > 3:
        weaknesses.append(f"Detected {metrics.filler_count} filler words (um, uh, like)")
        improvements.append("Practice pausing silently instead of using filler words")

    if metrics.transition_count >= 3:
        strengths.append("Good use of transition words for logical flow")

    if metrics.power_word_count >= 2:
        strengths.append("Effective use of impactful vocabulary")

    explainability = (
        f"Analysis based on {word_count} words across {metrics.sentence_count} sentences. "
        f"Lexical diversity: {metrics.unique_word_ratio:.0%}. "
        f"Filler density: {metrics.filler_ratio:.1%}. "
        f"Transitions: {metrics.transition_count}. Power words: {metrics.power_word_count}. "
        f"Soft hedging: {metrics.weak_word_count}. "
        f"Sentiment assertiveness: {sentiment.assertiveness:.0%}."
    )

    return AnalysisResult(
        clarity_score=clarity,
        confidence_score=confidence,
        content_score=content,
        delivery_score=delivery,
        overall_score=overall,
        strengths=strengths or ["Active participation shows commitment to improvement"],
        weaknesses=weaknesses or ["No critical weaknesses detected — keep practicing"],
        improvements=improvements or ["Try increasing session complexity for continuous growth"],
        explainability=explainability,
        metrics={
            "word_count": metrics.word_count,
            "sentence_count": metrics.sentence_count,
            "filler_count": metrics.filler_count,
            "transition_count": metrics.transition_count,
            "power_word_count": metrics.power_word_count,
            "weak_word_count": metrics.weak_word_count,
            "unique_word_ratio": metrics.unique_word_ratio,
        },
        sentiment={
            "positivity": sentiment.positivity,
            "assertiveness": sentiment.assertiveness,
            "stress": sentiment.stress_indicator,
        },
    )
