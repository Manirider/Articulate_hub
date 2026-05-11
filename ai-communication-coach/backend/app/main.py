from contextlib import asynccontextmanager

import socketio          
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html

from app.api.v1.routes import analytics, auth, health, modules, rooms, sessions, teams, viva
from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.telemetry import setup_telemetry
from app.core.logging_config import setup_sentry, logger
from app.db.database import Base, engine
from app.db.seed import seed_modules
from app.services.realtime import register_socket_handlers


# Note: asyncio.WindowsSelectorEventLoopPolicy was removed — deprecated since Python 3.14.
# Modern uvicorn + python-socketio handle Windows event loops correctly.

@asynccontextmanager
async def lifespan(_: FastAPI):
    # --- Startup validation ---
    if settings.environment.lower() == "production" and settings.jwt_secret in ("change_me", ""):
        logger.critical("FATAL: JWT_SECRET is set to default value in production. Refusing to start.")
        raise SystemExit("JWT_SECRET must be configured for production")

    if settings.jwt_secret == "change_me":
        logger.warning("JWT_SECRET is set to default — change this before deploying to production")

    # Initialize database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_modules()

    # --- AI infrastructure diagnostics ---
    from app.services.ai_diagnostics import ai_diagnostics
    if ai_diagnostics.is_ai_available():
        logger.info("AI services: OpenAI API key configured ✓")
    else:
        logger.warning(
            "AI services: OpenAI API key NOT configured — "
            "AI-powered features (viva, advanced feedback) will return 503. "
            "Set OPENAI_API_KEY in your environment to enable full capabilities."
        )

    if settings.gladia_api_key and not settings.gladia_api_key.startswith("YOUR_"):
        logger.info("Transcription: Gladia API key configured ✓")
    else:
        logger.warning("Transcription: Gladia API key NOT configured — using browser-side STT fallback")

    logger.info(f"Environment: {settings.environment} | Database: {'PostgreSQL' if 'postgresql' in settings.database_url else 'SQLite'}")

    yield

    # --- Shutdown ---
    from app.core.redis import close_redis
    await close_redis()

api = FastAPI(
    title="AI Communication Coach API",
    description="""
    Enterprise-grade AI coaching platform API.
    
    ## Features
    - Real-time voice analysis with Whisper/Gladia
    - Facial expression analysis with MediaPipe
    - Multi-agent AI feedback system
    - WebRTC video conferencing rooms
    - Team collaboration & analytics
    
    ## Authentication
    - JWT-based authentication
    - OAuth (Google, GitHub) support
    - Rate limiting protection
    
    ## AI Services
    - OpenAI GPT-4 for feedback generation
    - Gladia for transcription
    - Ollama for local LLM inference
    """,
    version="2.0.0",
    lifespan=lifespan,
    docs_url=None,  # Custom docs endpoint below
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
    openapi_tags=[
        {"name": "auth", "description": "Authentication endpoints"},
        {"name": "sessions", "description": "Practice session management"},
        {"name": "rooms", "description": "WebRTC video rooms"},
        {"name": "teams", "description": "Team collaboration"},
        {"name": "analytics", "description": "Performance analytics"},
        {"name": "health", "description": "Health & monitoring"},
    ]
)

# Setup Sentry error tracking
if setup_sentry():
    logger.info("Sentry initialized successfully")

# Setup OpenTelemetry tracing
setup_telemetry(api)

cors_origins = settings.cors_origins
allow_credentials = True
if "*" in cors_origins:
    cors_origins = ["*"]
    allow_credentials = False

api.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)
api.add_middleware(RateLimitMiddleware, max_requests_per_minute=settings.rate_limit_per_minute)

# Add security headers middleware
api.add_middleware(SecurityHeadersMiddleware)

api.include_router(health.router, prefix="/api/v1")
api.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
api.include_router(modules.router, prefix="/api/v1/modules", tags=["modules"])
api.include_router(sessions.router, prefix="/api/v1/sessions", tags=["sessions"])
api.include_router(rooms.router, prefix="/api/v1/rooms", tags=["rooms"])
api.include_router(teams.router, prefix="/api/v1/teams", tags=["teams"])
api.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
api.include_router(viva.router, prefix="/api/v1/sessions", tags=["viva"])

sio = socketio.AsyncServer(
    async_mode="asgi", 
    cors_allowed_origins="*" if "*" in settings.cors_origins else settings.cors_origins
)
register_socket_handlers(sio)
@api.get("/api/v1/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Custom Swagger UI endpoint."""
    return get_swagger_ui_html(
        openapi_url="/api/v1/openapi.json",
        title="AI Communication Coach API",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )

app = socketio.ASGIApp(sio, other_asgi_app=api)
