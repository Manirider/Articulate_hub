from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.config import settings
from app.core.redis import get_redis
from app.core.performance import monitor

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Comprehensive health check endpoint for monitoring."""
    health_data = {
        "status": "healthy",
        "service": "ai-communication-coach-backend",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.environment,
        "checks": {}
    }
    
    # Database check
    try:
        await db.execute(text("SELECT 1"))
        health_data["checks"]["database"] = {"status": "ok", "type": "postgresql" if "postgresql" in settings.database_url else "sqlite"}
    except Exception as e:
        health_data["checks"]["database"] = {"status": "error", "message": str(e)}
        health_data["status"] = "degraded"
    
    # AI Services check (configuration only, not actual service health)
    health_data["checks"]["ai_services"] = {
        "openai_configured": bool(settings.openai_api_key and not settings.openai_api_key.startswith("YOUR_")),
        "gladia_configured": bool(settings.gladia_api_key and not settings.gladia_api_key.startswith("YOUR_")),
        "whisper_model": settings.whisper_model
    }
    
    # OAuth configuration check
    health_data["checks"]["oauth"] = {
        "google_configured": bool(settings.google_client_id and not settings.google_client_id.startswith("YOUR_")),
        "github_configured": bool(
            settings.github_client_id and not settings.github_client_id.startswith("YOUR_") and
            settings.github_client_secret and not settings.github_client_secret.startswith("YOUR_")
        )
    }
    
    # Redis check
    try:
        redis_client = await get_redis()
        await redis_client.ping()
        health_data["checks"]["redis"] = {"status": "ok"}
    except Exception as e:
        health_data["checks"]["redis"] = {"status": "error", "message": str(e)}
        health_data["status"] = "degraded"
    
    return health_data


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Kubernetes-style readiness probe."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        return {"status": "not_ready", "error": str(e)}


@router.get("/health/live")
async def liveness_check():
    """Kubernetes-style liveness probe."""
    return {"status": "alive"}


@router.get("/health/metrics")
async def performance_metrics():
    """Performance metrics for monitoring."""
    return monitor.get_report()


@router.get("/health/circuit-breakers")
async def circuit_breaker_status():
    """Circuit breaker status for AI services."""
    from app.core.circuit_breaker import openai_breaker, gladia_breaker, ollama_breaker
    
    return {
        "circuit_breakers": [
            openai_breaker.get_state(),
            gladia_breaker.get_state(),
            ollama_breaker.get_state(),
        ]
    }


@router.get("/health/ai")
async def ai_health_check():
    """
    Detailed AI infrastructure health check.
    Performs live API calls to verify AI service availability.
    """
    from app.services.ai_diagnostics import ai_diagnostics, AIServiceStatus
    
    report = await ai_diagnostics.run_full_diagnostics()
    
    # Determine HTTP status based on overall health
    if report.overall_status == AIServiceStatus.HEALTHY:
        http_status = status.HTTP_200_OK
    elif report.overall_status == AIServiceStatus.DEGRADED:
        http_status = status.HTTP_200_OK  # Still operational
    elif report.overall_status == AIServiceStatus.NOT_CONFIGURED:
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    else:
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=http_status,
        content={
            "overall_status": report.overall_status.value,
            "timestamp": report.timestamp,
            "services": [
                {
                    "service": s.service,
                    "status": s.status.value,
                    "latency_ms": s.latency_ms,
                    "error": s.error_message,
                    "model": s.model
                }
                for s in report.services
            ],
            "recommendations": report.recommendations,
            "is_ai_available": ai_diagnostics.is_ai_available()
        }
    )


@router.get("/debug/database")
async def debug_database(db: AsyncSession = Depends(get_db)):
    """Debug endpoint to view database tables and counts.
    
    WARNING: Remove or secure this endpoint in production!
    """
    tables = ["users", "sessions", "transcripts", "scores", "rooms", 
              "room_participants", "teams", "team_members", "ai_feedback",
              "performance_history", "vision_scores", "user_progress"]
    
    db_type = "postgresql" if "postgresql" in settings.database_url else "sqlite"
    result = {"database_type": db_type, "tables": {}}
    
    for table in tables:
        try:
            count_result = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = count_result.scalar()
            
            # Get sample data (first 3 rows)
            sample_result = await db.execute(text(f"SELECT * FROM {table} LIMIT 3"))
            rows = sample_result.mappings().all()
            
            # Convert rows to dict
            sample_data = [dict(row) for row in rows] if rows else []
            
            result["tables"][table] = {
                "count": count,
                "sample_data": sample_data
            }
        except Exception as e:
            result["tables"][table] = {"error": str(e)}
    
    return result


@router.get("/debug/database/{table_name}")
async def debug_table(table_name: str, limit: int = 10, db: AsyncSession = Depends(get_db)):
    """View specific table data.
    
    WARNING: Remove or secure this endpoint in production!
    """
    try:
        # Get count
        count_result = await db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
        total_count = count_result.scalar()
        
        # Get data
        data_result = await db.execute(text(f"SELECT * FROM {table_name} LIMIT {limit}"))
        rows = data_result.mappings().all()
        
        # Convert to list of dicts, handling non-serializable types
        data = []
        for row in rows:
            row_dict = {}
            for key, value in dict(row).items():
                # Convert datetime objects to strings
                if hasattr(value, 'isoformat'):
                    row_dict[key] = value.isoformat()
                else:
                    row_dict[key] = value
            data.append(row_dict)
        
        return {
            "table": table_name,
            "total_count": total_count,
            "showing": len(data),
            "data": data
        }
    except Exception as e:
        return {"error": str(e), "table": table_name}
