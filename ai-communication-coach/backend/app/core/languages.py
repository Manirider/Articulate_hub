"""
Centralized language abstraction layer.

Eliminates hardcoded locale values across the platform, providing a single
source of truth for supported languages, speech recognition config, and
language-aware AI prompt generation.
"""

from enum import Enum
from typing import Any


class SupportedLanguage(str, Enum):
    """ISO 639-1 / BCP-47 language codes supported by the platform."""

    ENGLISH_US = "en-US"
    ENGLISH_UK = "en-GB"
    SPANISH = "es-ES"
    FRENCH = "fr-FR"
    GERMAN = "de-DE"
    PORTUGUESE = "pt-BR"
    CHINESE = "zh-CN"
    JAPANESE = "ja-JP"
    KOREAN = "ko-KR"
    HINDI = "hi-IN"
    ARABIC = "ar-SA"
    ITALIAN = "it-IT"


# ── Language metadata registry ─────────────────────────────────────────────

LANGUAGE_REGISTRY: dict[SupportedLanguage, dict[str, Any]] = {
    SupportedLanguage.ENGLISH_US: {
        "name": "English (US)",
        "native_name": "English",
        "flag": "🇺🇸",
        "direction": "ltr",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "English",
    },
    SupportedLanguage.ENGLISH_UK: {
        "name": "English (UK)",
        "native_name": "English",
        "flag": "🇬🇧",
        "direction": "ltr",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "English",
    },
    SupportedLanguage.SPANISH: {
        "name": "Spanish",
        "native_name": "Español",
        "flag": "🇪🇸",
        "direction": "ltr",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "Spanish",
    },
    SupportedLanguage.FRENCH: {
        "name": "French",
        "native_name": "Français",
        "flag": "🇫🇷",
        "direction": "ltr",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "French",
    },
    SupportedLanguage.GERMAN: {
        "name": "German",
        "native_name": "Deutsch",
        "flag": "🇩🇪",
        "direction": "ltr",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "German",
    },
    SupportedLanguage.PORTUGUESE: {
        "name": "Portuguese (Brazil)",
        "native_name": "Português",
        "flag": "🇧🇷",
        "direction": "ltr",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "Portuguese",
    },
    SupportedLanguage.CHINESE: {
        "name": "Chinese (Simplified)",
        "native_name": "中文",
        "flag": "🇨🇳",
        "direction": "ltr",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "Chinese",
    },
    SupportedLanguage.JAPANESE: {
        "name": "Japanese",
        "native_name": "日本語",
        "flag": "🇯🇵",
        "direction": "ltr",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "Japanese",
    },
    SupportedLanguage.KOREAN: {
        "name": "Korean",
        "native_name": "한국어",
        "flag": "🇰🇷",
        "direction": "ltr",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "Korean",
    },
    SupportedLanguage.HINDI: {
        "name": "Hindi",
        "native_name": "हिन्दी",
        "flag": "🇮🇳",
        "direction": "ltr",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "Hindi",
    },
    SupportedLanguage.ARABIC: {
        "name": "Arabic",
        "native_name": "العربية",
        "flag": "🇸🇦",
        "direction": "rtl",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "Arabic",
    },
    SupportedLanguage.ITALIAN: {
        "name": "Italian",
        "native_name": "Italiano",
        "flag": "🇮🇹",
        "direction": "ltr",
        "speech_recognition_supported": True,
        "ai_prompt_locale": "Italian",
    },
}

DEFAULT_LANGUAGE = SupportedLanguage.ENGLISH_US


# ── Public API ──────────────────────────────────────────────────────────────

def get_supported_languages() -> list[dict[str, Any]]:
    """Return list of all supported languages with metadata."""
    return [
        {"code": lang.value, **meta}
        for lang, meta in LANGUAGE_REGISTRY.items()
    ]


def validate_language_code(code: str) -> bool:
    """Check if a language code is supported."""
    return any(code == lang.value for lang in SupportedLanguage)


def get_language_or_default(code: str | None) -> SupportedLanguage:
    """Resolve a language code to a SupportedLanguage, falling back to default."""
    if code is None:
        return DEFAULT_LANGUAGE
    try:
        return SupportedLanguage(code)
    except ValueError:
        return DEFAULT_LANGUAGE


def get_ai_prompt_locale(code: str | None) -> str:
    """Return the human-readable locale name for AI prompt injection."""
    lang = get_language_or_default(code)
    return LANGUAGE_REGISTRY[lang]["ai_prompt_locale"]


def get_speech_config(code: str | None) -> dict[str, Any]:
    """Return speech recognition configuration for the given language."""
    lang = get_language_or_default(code)
    meta = LANGUAGE_REGISTRY[lang]
    return {
        "lang": lang.value,
        "continuous": True,
        "interimResults": True,
        "direction": meta["direction"],
        "supported": meta["speech_recognition_supported"],
    }
