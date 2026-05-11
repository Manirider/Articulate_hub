"""Pytest configuration and fixtures for AI Communication Coach tests.

Uses PostgreSQL for tests (matching production) with proper test isolation.
"""
import os
import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

# Force test environment
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "test-secret-key-only-for-testing-do-not-use-in-production"
os.environ["JWT_ALGORITHM"] = "HS256"

# Use test database from environment or default (sqlite in memory)
TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./test_db.sqlite3"
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

# Disable AI for tests (will test AI-specific paths separately)
os.environ["OPENAI_API_KEY"] = ""
os.environ["GLADIA_API_KEY"] = ""

# Increase rate limit to prevent 429 during batch test execution
os.environ["RATE_LIMIT_PER_MINUTE"] = "10000"

from app.main import api  # noqa: E402
from app.db.database import Base, engine, get_db  # noqa: E402
from app.db.seed import seed_modules  # noqa: E402
from unittest.mock import AsyncMock, patch, MagicMock

# Create test session factory
TestingSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True, scope="function")
def mock_redis():
    """Mock Redis for all tests."""
    mock = AsyncMock()
    mock.ping.return_value = True
    mock.get.return_value = None
    mock.set.return_value = True
    mock.delete.return_value = True
    with patch("app.core.redis.get_redis", return_value=mock):
        with patch("app.api.v1.routes.health.get_redis", return_value=mock):
            yield mock


@pytest.fixture(autouse=True, scope="function")
def mock_ai_diagnostics():
    """Mock AI diagnostics to avoid real API calls during tests."""
    with patch("app.api.v1.routes.viva.ai_diagnostics") as mock:
        mock.is_ai_available.return_value = False  # AI not available in tests
        yield mock


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a database session for tests with automatic rollback."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed modules using its own session creation
    await seed_modules()

    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """Provide a test HTTP client with database setup."""
    # Override the get_db dependency to use our test session
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    # Store original dependency
    original_dependency = api.dependency_overrides.get(get_db)

    # Override with test session
    api.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=api)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client

    # Restore original dependency
    if original_dependency:
        api.dependency_overrides[get_db] = original_dependency
    else:
        del api.dependency_overrides[get_db]
