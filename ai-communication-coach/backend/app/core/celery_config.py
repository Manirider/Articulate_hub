"""Celery configuration for background AI processing."""
from celery import Celery
from app.core.config import settings

# Initialize Celery
celery_app = Celery(
    'ai_coach',
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=['app.services.ai_tasks']
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task execution
    task_always_eager=False,  # Set True for testing (synchronous)
    task_store_eager_result=True,
    task_ignore_result=False,
    
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    
    # Result backend
    result_expires=3600,  # 1 hour
    result_backend=settings.redis_url,
    
    # Task routing
    task_routes={
        'app.services.ai_tasks.process_transcription': {'queue': 'ai_pipeline'},
        'app.services.ai_tasks.generate_feedback': {'queue': 'ai_pipeline'},
        'app.services.ai_tasks.analyze_vision': {'queue': 'ai_vision'},
        'app.services.ai_tasks.send_email': {'queue': 'notifications'},
    },
    
    # Task annotations (rate limiting)
    task_annotations={
        'app.services.ai_tasks.process_transcription': {
            'rate_limit': '10/m',  # 10 per minute
        },
        'app.services.ai_tasks.generate_feedback': {
            'rate_limit': '20/m',
        },
    },
    
    # Retry settings
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
)

# Beat schedule (periodic tasks)
celery_app.conf.beat_schedule = {
    'cleanup-old-sessions': {
        'task': 'app.services.maintenance.cleanup_old_sessions',
        'schedule': 3600.0,  # Every hour
    },
    'generate-daily-reports': {
        'task': 'app.services.maintenance.generate_daily_reports',
        'schedule': 86400.0,  # Every 24 hours
    },
}
