"""SQLAlchemy model for persisting multi-modal vision/voice scores per session."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class VisionScore(Base):
    __tablename__ = "vision_scores"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False)

    # Vision metrics (0-100 scale)
    eye_contact_score: Mapped[float] = mapped_column(Float, default=0.0)
    head_stability_score: Mapped[float] = mapped_column(Float, default=0.0)
    expression_score: Mapped[float] = mapped_column(Float, default=0.0)
    face_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Voice metrics (0-100 scale)
    voice_energy_score: Mapped[float] = mapped_column(Float, default=0.0)
    voice_pace_score: Mapped[float] = mapped_column(Float, default=0.0)
    voice_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Fused result
    confidence_composite: Mapped[float] = mapped_column(Float, default=0.0)  # 0-10 scale
    engagement_level: Mapped[str] = mapped_column(String, default="moderate")
    eye_contact_label: Mapped[str] = mapped_column(String, default="moderate")
    head_movement_label: Mapped[str] = mapped_column(String, default="moderate")
    voice_stability_label: Mapped[str] = mapped_column(String, default="moderate")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
