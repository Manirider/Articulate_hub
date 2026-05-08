# AI Communication Coach - Production Deployment Guide

Complete deployment instructions for the AI Communication Coach platform.

---

## 🚀 Quick Start Options

### Option 1: Docker Compose (Recommended for Local/Testing)

```bash
# Clone and start
cd ai-communication-coach
docker-compose up -d

# Access
Frontend: http://localhost:3000
Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs
```

**Services included:**
- PostgreSQL 16 (database)
- Redis 7 (caching)
- Ollama (local LLM)
- FastAPI backend
- Next.js frontend

---

### Option 2: Render.com (Recommended for Production)

#### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial production release"
git remote add origin https://github.com/YOUR_USERNAME/ai-communication-coach.git
git push -u origin main
```

#### Step 2: Deploy to Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will detect `render.yaml` and configure automatically

#### Step 3: Configure Environment Variables
In Render dashboard, set these for the **backend service**:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Random 32+ character string | Yes |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | For Google OAuth |
| `GITHUB_CLIENT_ID` | From GitHub Settings | For GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | From GitHub Settings | For GitHub OAuth |
| `GITHUB_REDIRECT_URI` | `https://your-backend.onrender.com/api/v1/auth/github/callback` | For GitHub OAuth |
| `FRONTEND_URL` | `https://your-frontend.onrender.com` | Yes |
| `GLADIA_API_KEY` | From Gladia.io | For transcription |

For the **frontend service**:

| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same as backend | For Google OAuth |

---

### Option 3: Manual Server Deployment

#### Backend Setup
```bash
# SSH into your server
cd /var/www/ai-communication-coach/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql+psycopg://user:pass@localhost/ai_coach
JWT_SECRET=your-super-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret
FRONTEND_URL=https://yourdomain.com
ENVIRONMENT=production
EOF

# Run database migrations
python -c "from app.db.database import init_db; import asyncio; asyncio.run(init_db())"

# Start with Gunicorn + Uvicorn workers
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### Frontend Setup
```bash
cd /var/www/ai-communication-coach/frontend

# Install dependencies
npm install

# Build
npm run build

# Serve with PM2
npm install -g pm2
pm2 start npm --name "ai-coach-frontend" -- start
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

---

## 🔧 OAuth Setup

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Configure consent screen (External for testing)
6. Application type: Web application
7. Authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
8. Authorized redirect URIs:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
9. Copy Client ID and Secret to environment variables

### GitHub OAuth
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Application name: "AI Communication Coach"
4. Homepage URL: `https://yourdomain.com`
5. Authorization callback URL: `https://your-backend.onrender.com/api/v1/auth/github/callback`
6. Copy Client ID and generate Client Secret
7. Add to environment variables

---

## 🗄 Database Setup

### PostgreSQL (Production)
```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE ai_coach;"
sudo -u postgres psql -c "CREATE USER ai_coach WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ai_coach TO ai_coach;"

# Connection string format
DATABASE_URL=postgresql+psycopg://ai_coach:your_password@localhost:5432/ai_coach
```

### SQLite (Development/Single-User)
Already configured by default. No setup needed.

---

## 📊 Monitoring & Health Checks

### Health Endpoint
```bash
curl https://your-backend.onrender.com/api/v1/health
```

Response:
```json
{
  "status": "healthy",
  "service": "ai-communication-coach-backend",
  "version": "1.0.0",
  "timestamp": "2026-05-08T10:00:00+00:00",
  "environment": "production",
  "checks": {
    "database": {"status": "ok", "type": "postgresql"},
    "ai_services": {
      "openai_configured": true,
      "gladia_configured": false,
      "whisper_model": "tiny"
    },
    "oauth": {
      "google_configured": true,
      "github_configured": true
    }
  }
}
```

### Frontend Health Indicator
The navbar displays real-time API status with latency information.

---

## 🔒 Security Checklist

- [ ] Change default JWT_SECRET to 32+ random characters
- [ ] Use HTTPS in production ( enforced by Render/nginx)
- [ ] Configure CORS origins (not `*` in production)
- [ ] Set secure cookie flags
- [ ] Enable rate limiting (already configured: 120 req/min)
- [ ] Use PostgreSQL (not SQLite) for production
- [ ] Regular dependency updates: `npm audit fix`, `pip list --outdated`

---

## 📈 Performance Optimization

### Backend
- Database connection pooling (handled by SQLAlchemy)
- Async endpoints throughout
- Cached static files with nginx
- Gzip compression enabled

### Frontend
- Next.js static generation where possible
- Lazy loading for heavy components (Three.js, MediaPipe)
- Image optimization with next/image
- Code splitting by route

---

## 🐛 Troubleshooting

### Frontend build fails
```bash
cd frontend
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Backend won't start
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt --force-reinstall
python run_local.py
```

### Database connection issues
- Check DATABASE_URL format
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Verify firewall rules allow port 5432

### WebSocket/Socket.IO not connecting
- Check CORS_ORIGINS includes your frontend URL
- Ensure nginx proxy headers are set correctly
- Verify WebSocket support in hosting provider

### OAuth login fails
- Verify redirect URIs match exactly (including protocol)
- Check Client ID/Secret are correct
- Ensure consent screen is published (Google) for production

---

## 🔄 Backup & Recovery

### Database Backup (PostgreSQL)
```bash
# Daily backup
crontab -e
0 2 * * * pg_dump ai_coach > /backups/ai_coach_$(date +\%Y\%m\%d).sql

# Restore
psql ai_coach < backup_file.sql
```

### SQLite Backup
```bash
cp local-dev.db backups/local-dev_$(date +%Y%m%d).db
```

---

## 📝 Environment Variable Reference

### Backend (.env)
```
# Required
DATABASE_URL=sqlite+aiosqlite:///./local-dev.db
JWT_SECRET=change-me-in-production-minimum-32-chars
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret
GITHUB_REDIRECT_URI=http://localhost:8000/api/v1/auth/github/callback

# AI Services (optional)
OPENAI_API_KEY=your-openai-key
GLADIA_API_KEY=your-gladia-key

# Performance
RATE_LIMIT_PER_MINUTE=120
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## 🆘 Support

For issues or questions:
1. Check health endpoint: `/api/v1/health`
2. Review logs: `docker-compose logs` or `pm2 logs`
3. Check browser console for frontend errors
4. Verify environment variables are set correctly

---

**Deployment Guide Version:** 1.0.0  
**Last Updated:** May 2026
