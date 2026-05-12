"""Language configuration API endpoints."""

from fastapi import APIRouter

from app.core.languages import get_supported_languages, get_speech_config, validate_language_code

router = APIRouter()


@router.get("/languages")
async def list_languages():
    """Return all supported languages with metadata."""
    return {"languages": get_supported_languages()}


@router.get("/languages/{code}/speech-config")
async def speech_config(code: str):
    """Return speech recognition configuration for a specific language."""
    if not validate_language_code(code):
        return {"error": f"Unsupported language: {code}"}, 400
    return get_speech_config(code)
