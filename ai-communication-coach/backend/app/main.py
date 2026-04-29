from contextlib import asynccontextmanager

import socketio          
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes import analytics, auth, health, modules, sessions
from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.db.database import Base, engine
from app.db.seed import seed_modules
from app.services.realtime import register_socket_handlers


# Note: asyncio.WindowsSelectorEventLoopPolicy was removed — deprecated since Python 3.14.
# Modern uvicorn + python-socketio handle Windows event loops correctly.

@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_modules()
    yield

api = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
api.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
api.add_middleware(RateLimitMiddleware, max_requests_per_minute=settings.rate_limit_per_minute)

api.include_router(health.router, prefix="/api/v1")
api.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
api.include_router(modules.router, prefix="/api/v1/modules", tags=["modules"])
api.include_router(sessions.router, prefix="/api/v1/sessions", tags=["sessions"])
api.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=settings.cors_origins)
register_socket_handlers(sio)
app = socketio.ASGIApp(sio, other_asgi_app=api)
