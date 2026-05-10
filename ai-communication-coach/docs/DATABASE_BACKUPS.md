# Database Backup & Recovery Strategy

## Automated Backups (Render.com)

### PostgreSQL Backups
Render.com provides **automatic daily backups** for PostgreSQL instances:

| Feature | Configuration |
|---------|--------------|
| **Backup Frequency** | Daily at 00:00 UTC |
| **Retention** | 7 days (free tier) / 30 days (paid) |
| **Backup Type** | Full logical backups (pg_dump) |
| **Storage** | Render-managed S3 |

### Accessing Backups

```bash
# Via Render Dashboard
1. Go to https://dashboard.render.com
2. Select your PostgreSQL service
3. Click "Backups" tab
4. Download or restore from available backups

# Via Render CLI (optional)
render psql --connect <service-name>
```

### Manual Backup (Emergency)

```bash
# Create manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_20240101_120000.sql
```

## Point-in-Time Recovery (PITR)

**Note:** PITR requires Render's paid plan with WAL archiving.

For free tier, use **daily backups** with application-level audit logging.

## Backup Verification

```python
# Add to health check endpoint
@app.get("/health/backups")
async def backup_status():
    return {
        "last_backup": "2024-01-15 00:00:00 UTC",
        "backup_status": "healthy",
        "retention_days": 7,
        "next_backup": "2024-01-16 00:00:00 UTC"
    }
```

## Disaster Recovery Plan

### RTO/RPO Targets
| Metric | Target | Implementation |
|--------|--------|----------------|
| **RTO** (Recovery Time) | < 30 minutes | Automated Render restore |
| **RPO** (Data Loss) | < 24 hours | Daily backups |

### Recovery Steps

1. **Identify failure** via `/health` endpoint alerts
2. **Create incident** in monitoring system
3. **Restore from backup** via Render dashboard
4. **Verify data integrity** with health checks
5. **Resume traffic** after validation

## Redis Persistence

Redis data is ephemeral by design. For critical data:

```yaml
# Enable AOF persistence in render.yaml
- type: redis
  name: ai-coach-redis
  ipAllowList: []
  plan: standard  # Upgrade for persistence
```

**Best Practice:** Store only cache/session data in Redis. Persistent data goes to PostgreSQL.

## Monitoring

```python
# Add to app/core/monitoring.py
async def check_backup_health():
    """Check if backups are being created."""
    # Query Render API or check backup timestamps
    pass
```

## Cost Estimation

| Component | Free Tier | Paid Tier |
|-----------|-----------|-----------|
| PostgreSQL Backups | 7 days | 30 days |
| Storage | Included | ~$0.10/GB/month |
| PITR | Not available | Available |

---

**Last Updated:** May 10, 2026  
**Owner:** Platform Engineering Team
