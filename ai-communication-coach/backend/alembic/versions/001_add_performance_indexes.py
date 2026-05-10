"""Add performance indexes for common queries.

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # User indexes
    op.create_index('idx_user_email', 'users', ['email'], unique=True)
    op.create_index('idx_user_google_id', 'users', ['google_id'], unique=False)
    
    # Session indexes
    op.create_index('idx_session_user_id', 'sessions', ['user_id'], unique=False)
    op.create_index('idx_session_status', 'sessions', ['status'], unique=False)
    op.create_index('idx_session_created', 'sessions', ['created_at'], unique=False)
    
    # Score indexes
    op.create_index('idx_score_user_session', 'scores', ['user_id', 'session_id'], unique=False)
    op.create_index('idx_score_overall', 'scores', ['overall_score'], unique=False)
    
    # Performance history indexes
    op.create_index('idx_perf_history_user', 'performance_history', ['user_id'], unique=False)
    op.create_index('idx_perf_history_date', 'performance_history', ['recorded_at'], unique=False)
    
    # Room indexes
    op.create_index('idx_room_code', 'rooms', ['code'], unique=True)
    op.create_index('idx_room_status', 'rooms', ['status'], unique=False)
    
    # Team indexes
    op.create_index('idx_team_code', 'teams', ['code'], unique=True)
    
    # Transcript indexes
    op.create_index('idx_transcript_session', 'transcripts', ['session_id'], unique=False)
    
    # Recording indexes
    op.create_index('idx_recording_session', 'recordings', ['session_id'], unique=False)


def downgrade():
    op.drop_index('idx_user_email', table_name='users')
    op.drop_index('idx_user_google_id', table_name='users')
    op.drop_index('idx_session_user_id', table_name='sessions')
    op.drop_index('idx_session_status', table_name='sessions')
    op.drop_index('idx_session_created', table_name='sessions')
    op.drop_index('idx_score_user_session', table_name='scores')
    op.drop_index('idx_score_overall', table_name='scores')
    op.drop_index('idx_perf_history_user', table_name='performance_history')
    op.drop_index('idx_perf_history_date', table_name='performance_history')
    op.drop_index('idx_room_code', table_name='rooms')
    op.drop_index('idx_room_status', table_name='rooms')
    op.drop_index('idx_team_code', table_name='teams')
    op.drop_index('idx_transcript_session', table_name='transcripts')
    op.drop_index('idx_recording_session', table_name='recordings')
