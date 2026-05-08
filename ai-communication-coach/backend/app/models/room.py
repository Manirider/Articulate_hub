"""Room model — multi-user session rooms."""

import secrets
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _generate_room_code() -> str:
    """Generate a 6-character uppercase alphanumeric room code."""
    return secrets.token_hex(3).upper()  # e.g. "A3F1B2"


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False, default=_generate_room_code)
    host_user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="Practice Room")
    mode: Mapped[str] = mapped_column(String(30), nullable=False, default="practice")  # practice | team_2v2 | team_3v3
    max_participants: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="waiting", index=True, nullable=False)  # waiting | active | completed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
