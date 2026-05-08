"""Room report model — persists individual + group analysis per room session."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Uuid, func
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class RoomReport(Base):
    __tablename__ = "room_reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), index=True, nullable=False)
    report_type: Mapped[str] = mapped_column(String(30), nullable=False)  # "individual" | "group" | "team"

    # For individual reports — which user this is for
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    team: Mapped[str | None] = mapped_column(String(10), nullable=True)  # For team reports

    # Scores (0-100)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    clarity_score: Mapped[float] = mapped_column(Float, default=0.0)
    content_score: Mapped[float] = mapped_column(Float, default=0.0)
    delivery_score: Mapped[float] = mapped_column(Float, default=0.0)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Multi-modal scores
    eye_contact_score: Mapped[float] = mapped_column(Float, default=0.0)
    voice_energy_score: Mapped[float] = mapped_column(Float, default=0.0)
    engagement_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Group-specific metrics (JSON)
    speaking_time_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    interruption_count: Mapped[float] = mapped_column(Float, default=0.0)

    # Structured feedback (JSON arrays)
    strengths: Mapped[dict | None] = mapped_column(SQLiteJSON, nullable=True)
    weaknesses: Mapped[dict | None] = mapped_column(SQLiteJSON, nullable=True)
    suggestions: Mapped[dict | None] = mapped_column(SQLiteJSON, nullable=True)

    # Group report fields (JSON)
    group_metrics: Mapped[dict | None] = mapped_column(SQLiteJSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
