"""Create password_reset_tokens table."""
import asyncio
import logging

from sqlalchemy import text
from app.db.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_password_reset_table():
    """Create the password_reset_tokens table."""
    async with engine.begin() as conn:
        # Check if table already exists
        result = await conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='password_reset_tokens'"
        ))
        if result.scalar_one_or_none():
            logger.info("password_reset_tokens table already exists")
            return
        
        # Create the table
        await conn.execute(text("""
            CREATE TABLE password_reset_tokens (
                id BLOB PRIMARY KEY,
                user_id BLOB NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """))
        
        # Create index on token for fast lookups
        await conn.execute(text(
            "CREATE INDEX idx_reset_token ON password_reset_tokens(token)"
        ))
        
        logger.info("password_reset_tokens table created successfully")


if __name__ == "__main__":
    asyncio.run(create_password_reset_table())
