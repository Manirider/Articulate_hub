"""Celery tasks for background AI processing."""
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError
import logging

from app.core.celery_config import celery_app
from app.core.circuit_breaker import circuit_breaker, gladia_breaker, openai_breaker, ollama_breaker
from app.services.transcription import transcription_service
from app.services.agents.orchestrator import AIOrchestrator

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue='ai_pipeline'
)
def process_transcription(self, audio_content: bytes, filename: str, session_id: int):
    """Process audio transcription in background."""
    try:
        result = transcription_service.transcribe(audio_content, filename)
        
        # Store result in database
        # TODO: Update session transcript
        
        return {
            'status': 'success',
            'session_id': session_id,
            'transcript': result.get('text'),
        }
    except Exception as exc:
        logger.error(f"Transcription failed: {exc}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            countdown = 60 * (2 ** self.request.retries)  # 60s, 120s, 240s
            raise self.retry(exc=exc, countdown=countdown)
        
        # Max retries exceeded
        return {
            'status': 'failed',
            'session_id': session_id,
            'error': str(exc),
        }


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue='ai_pipeline'
)
def generate_feedback(self, session_id: int, transcript: str, user_id: int):
    """Generate AI feedback in background."""
    try:
        orchestrator = AIOrchestrator()
        
        # Run analysis
        result = orchestrator.analyze_and_coach(
            transcript=transcript,
            user_id=user_id,
            context={}
        )
        
        return {
            'status': 'success',
            'session_id': session_id,
            'feedback': result,
        }
    except Exception as exc:
        logger.error(f"Feedback generation failed: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60)
        
        return {
            'status': 'failed',
            'session_id': session_id,
            'error': str(exc),
        }


@celery_app.task(
    bind=True,
    max_retries=3,
    queue='notifications'
)
def send_email_async(self, email_type: str, user_id: int, **kwargs):
    """Send email notifications asynchronously."""
    from app.services.email import email_service
    
    try:
        if email_type == 'welcome':
            result = email_service.send_welcome_email(
                kwargs['email'],
                kwargs['full_name']
            )
        elif email_type == 'password_reset':
            result = email_service.send_password_reset_email(
                kwargs['email'],
                kwargs['full_name'],
                kwargs['reset_url']
            )
        else:
            raise ValueError(f"Unknown email type: {email_type}")
        
        return {'status': 'success' if result else 'failed'}
    except Exception as exc:
        logger.error(f"Email sending failed: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        
        return {'status': 'failed', 'error': str(exc)}


@celery_app.task(queue='maintenance')
def cleanup_old_sessions():
    """Periodic task to cleanup old sessions."""
    from app.db.database import SessionLocal
    from sqlalchemy import text
    from datetime import datetime, timedelta
    
    logger.info("Running session cleanup task")
    
    try:
        async with SessionLocal() as session:
            # Delete sessions older than 30 days
            cutoff = datetime.utcnow() - timedelta(days=30)
            
            result = await session.execute(
                text("""
                    DELETE FROM sessions 
                    WHERE created_at < :cutoff 
                    AND status = 'completed'
                """),
                {"cutoff": cutoff}
            )
            
            await session.commit()
            logger.info(f"Cleaned up {result.rowcount} old sessions")
            
    except Exception as e:
        logger.error(f"Session cleanup failed: {e}")
        raise


@celery_app.task(queue='maintenance')
def generate_daily_reports():
    """Generate daily analytics reports."""
    from app.db.database import SessionLocal
    from datetime import datetime, timedelta
    
    logger.info("Generating daily reports")
    
    try:
        # TODO: Implement report generation
        # This could aggregate metrics, send reports to admins, etc.
        
        return {'status': 'success', 'generated_at': datetime.utcnow().isoformat()}
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise
