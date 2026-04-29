import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"

from app.main import api  # noqa: E402
from app.db.database import Base, engine  # noqa: E402
from app.db.seed import seed_modules  # noqa: E402


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await seed_modules()

    transport = ASGITransport(app=api)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
