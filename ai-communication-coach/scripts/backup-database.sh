#!/bin/bash
# Database Backup Script for AI Communication Coach

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATABASE_URL="${DATABASE_URL:-sqlite+aiosqlite:///./ai_coach.db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.db"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."
echo "📂 Backup directory: $BACKUP_DIR"
echo "📅 Timestamp: $DATE"

# Extract database path from URL
if [[ $DATABASE_URL == *"sqlite"* ]]; then
    DB_PATH=$(echo $DATABASE_URL | sed 's/.*:///')
    
    if [ -f "$DB_PATH" ]; then
        # Create SQLite backup
        sqlite3 "$DB_PATH" ".backup '${BACKUP_DIR}/${BACKUP_FILE}'"
        echo "✅ SQLite backup created: $BACKUP_FILE"
    else
        echo "⚠️ Database file not found: $DB_PATH"
        exit 1
    fi
else
    # PostgreSQL backup
    pg_dump "$DATABASE_URL" > "${BACKUP_DIR}/${BACKUP_FILE}.sql"
    echo "✅ PostgreSQL backup created: ${BACKUP_FILE}.sql"
fi

# Compress backup
cd "$BACKUP_DIR"
gzip -f "$BACKUP_FILE" 2>/dev/null || true
echo "📦 Backup compressed"

# Clean old backups (keep last $RETENTION_DAYS days)
echo "🧹 Cleaning old backups..."
find "$BACKUP_DIR" -name "backup_*.db*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
echo "✅ Old backups cleaned (retention: $RETENTION_DAYS days)"

# List recent backups
echo ""
echo "📋 Recent backups:"
ls -lh "$BACKUP_DIR" | tail -5

echo ""
echo "🎉 Backup completed successfully!"
