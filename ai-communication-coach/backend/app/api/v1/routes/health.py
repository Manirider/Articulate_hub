from datetime import datetime, timezone
from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.db.database import get_db, engine
from app.core.config import settings

router = APIRouter()


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
    
    return health_data


@router.get("/debug/database")
async def debug_database(db: AsyncSession = Depends(get_db)):
    """Debug endpoint to view database tables and counts.
    
    WARNING: Remove or secure this endpoint in production!
    """
    tables = ["users", "sessions", "transcripts", "scores", "rooms", 
              "room_participants", "teams", "team_members", "ai_feedback",
              "performance_history", "vision_scores", "user_progress"]
    
    result = {"database_type": "sqlite", "tables": {}}
    
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
