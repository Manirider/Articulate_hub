from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.performance_history import PerformanceHistory
from app.models.user import User
from app.schemas.analytics import AnalyticsOverviewResponse

router = APIRouter()


@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stats_query = select(
        func.count(PerformanceHistory.id).label("total"),
        func.avg(PerformanceHistory.overall_score).label("avg_overall"),
        func.avg(PerformanceHistory.clarity_score).label("avg_clarity"),
        func.avg(PerformanceHistory.confidence_score).label("avg_conf"),
        func.avg(PerformanceHistory.content_score).label("avg_content"),
        func.avg(PerformanceHistory.delivery_score).label("avg_delivery"),
    ).where(PerformanceHistory.user_id == current_user.id)

    stats_result = await db.execute(stats_query)
    row = stats_result.one_or_none()

    sessions_completed = int(row.total or 0) if row else 0
    average_score = round(float(row.avg_overall or 0), 2) if row else 0.0
    avg_clarity = round(float(row.avg_clarity or 0), 2) if row else 0.0
    avg_confidence = round(float(row.avg_conf or 0), 2) if row else 0.0
    avg_content = round(float(row.avg_content or 0), 2) if row else 0.0
    avg_delivery = round(float(row.avg_delivery or 0), 2) if row else 0.0

    trend_result = await db.execute(
        select(PerformanceHistory.overall_score)
        .where(PerformanceHistory.user_id == current_user.id)
        .order_by(PerformanceHistory.created_at.desc())
        .limit(10)
    )
    score_trend = [float(score) for score in reversed(trend_result.scalars().all())]

    leaderboard_rank_hint = max(1, 1000 - current_user.xp)

    return AnalyticsOverviewResponse(
        sessions_completed=sessions_completed,
        average_score=average_score,
        level=current_user.level,
        xp=current_user.xp,
        streak_days=current_user.streak_days,
        score_trend=score_trend,
        leaderboard_rank_hint=leaderboard_rank_hint,
        avg_clarity=avg_clarity,
        avg_confidence=avg_confidence,
        avg_content=avg_content,
        avg_delivery=avg_delivery,
    )
