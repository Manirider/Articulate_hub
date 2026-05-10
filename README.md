#  AI Communication Coach

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen" alt="Status">
  <img src="https://img.shields.io/github/actions/workflow/status/Manirider/Articulate_hub/ci-cd.yml?branch=main" alt="CI Status">
  <img src="https://img.shields.io/badge/Coverage-80%25-brightgreen" alt="Coverage">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python" alt="Python">
</p>

<p align="center">
  <strong>World-class AI-powered communication training platform</strong><br>
  Master your voice with multi-modal AI analysis, real-time feedback, and immersive 3D experience
</p>


##  Features

## Core Training
- **5 Training Modules**: Group Discussion, Debate, Presentation, JAM, Interview
- **4 Practice Modes**: Demo, Personal Practice, AI Mode, Friends Mode
- **Real-time Analysis**: Voice, face, and content evaluation
- **AI Coaching**: Personalized feedback and improvement tips
- **Viva/Q&A Anxiety Training**: Defend ideas against an AI examiner in real-time

### Feature ⟷ Implementation Mapping
| Feature | Code Implementation Path |
|---------|--------------------------|
| **Viva/Q&A Anxiety Training** | `frontend/src/app/practice/viva/page.tsx` & `backend/app/api/v1/routes/viva.py` |
| **5-Agent AI Orchestrator** | `backend/app/services/agents/orchestrator.py` |
| **Real-Time Video Rooms** | `frontend/src/app/room/[id]/page.tsx` & `backend/app/api/v1/routes/rooms.py` |
| **OAuth & JWT Auth** | `frontend/src/app/auth/page.tsx` & `backend/app/api/v1/routes/auth.py` |
| **Multi-Modal Analytics** | `backend/app/services/ai_pipeline/` & `frontend/src/components/FaceAnalysisPanel.tsx` |

### AI Pipeline (5-Agent Orchestrator)
| Agent | Function |
|-------|----------|
| **Conversation Agent** | Generates contextual AI responses |
| **Observer Agent** | Behavioral analysis (fillers, pacing) |
| **Evaluation Agent** | Quantitative scoring (4 dimensions) |
| **Feedback Agent** | Actionable coaching insights |
| **Psychology Agent** | Sentiment and stress analysis |

###  Multi-Modal Analysis
- **Voice Analysis**: Speech recognition, tone analysis, filler detection
- **Face Analysis**: Eye contact, head movement, engagement (MediaPipe 478 points)
- **Content Analysis**: Clarity, confidence, delivery, content scoring
- **Multi-User Rooms**: WebRTC video/audio with AI observer

###  Premium UX
- **3D Immersive UI**: Three.js + React Three Fiber
- **Glassmorphism Design**: Modern, premium aesthetic
- **Real-time Animations**: Framer Motion + GSAP
- **Responsive**: Desktop, tablet, mobile optimized

##  Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js 14 + React + TypeScript + Tailwind CSS             │
│  ├─ 3D Scene (Three.js / React Three Fiber)               │
│  ├─ Face Analysis (MediaPipe FaceLandmarker)                │
│  ├─ Voice Processing (Web Audio API + Web Speech)          │
│  └─ Real-time Sync (Socket.IO Client)                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  FastAPI + SQLAlchemy + Socket.IO + JWT                     │
│  ├─ AI Pipeline (5-Agent Orchestrator)                     │
│  ├─ Transcription (Whisper + Gladia API)                  │
│  ├─ Multi-User Rooms (WebRTC + Socket.IO)                  │
│  └─ Authentication (JWT + OAuth Google/GitHub)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                                │
│  SQLite (Dev) / PostgreSQL (Production)                    │
│  ├─ Users, Sessions, Scores                                │
│  ├─ Transcripts, AI Feedback                               │
│  ├─ Rooms, Teams, Analytics                                │
│  └─ Performance History, Vision Scores                   │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Git

### Local Development

```bash
# Clone repository
git clone https://github.com/Manirider/Articulate_hub.git
cd Articulate_hub/ai-communication-coach

# Setup Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run_local.py

# Setup Frontend (new terminal)
cd frontend
npm install
npm run dev

# Access application
open http://localhost:3000
```

### Docker (One Command)

```bash
# Using Docker Compose
docker-compose up

# Or single container
docker-compose -f docker-compose.single.yml up
```

## 📊 Scoring System

| Metric | Range | Weight |
|--------|-------|--------|
| **Clarity** | 0-100 | 25% |
| **Confidence** | 0-100 | 25% |
| **Content** | 0-100 | 25% |
| **Delivery** | 0-100 | 25% |
| **Overall** | 0-100 | Average |

**Multi-Modal Fusion:** Voice (40%) + Face (40%) + Content (20%)



##  Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS + Glassmorphism
- **Animation**: Framer Motion, GSAP, Three.js
- **Icons**: Lucide React
- **Charts**: Recharts
- **State**: React Hooks + Context

### Backend
- **Framework**: FastAPI 0.109
- **Language**: Python 3.11
- **Database**: SQLAlchemy (Async) + Alembic
- **Auth**: JWT + OAuth2 (Google, GitHub)
- **Real-time**: Socket.IO
- **AI/ML**: OpenAI, Whisper, MediaPipe

### Infrastructure
- **Deployment**: Render.com
- **CI/CD**: GitHub Actions
- **Testing**: Playwright (E2E)
- **Monitoring**: Core Web Vitals
- **Security**: Pre-commit hooks, Trivy scan


## Project Structure

```
ai-communication-coach/
├── frontend/                 # Next.js 14 Application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   └── services/        # API services
│   └── package.json
│
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/v1/routes/   # API endpoints
│   │   ├── models/          # Database models
│   │   ├── services/        # Business logic
│   │   └── core/            # Config, auth
│   ├── alembic/             # Database migrations
│   └── requirements.txt
│
├── e2e/                      # Playwright E2E Tests
│   ├── tests/
│   └── playwright.config.ts
│
├── scripts/                  # Utility scripts
│   └── backup-database.sh
│
└── docker-compose.yml        # Docker orchestration
```


## Testing

```bash
# E2E Tests
cd e2e
npm install
npx playwright test

# View report
npx playwright show-report
```

**Coverage:** Auth, Navigation, Modules, Cross-browser (Chrome, Firefox, Safari, Mobile)

## 📈 Performance Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| First Load JS | < 100 KB | 87.5 KB ✅ |
| Time to Interactive | < 5s | ~3s ✅ |
| API Response | < 500ms | ~200ms ✅ |
| 3D FPS | > 30 | 60 ✅ |


## Security

-  JWT Authentication (HS256)
-  bcrypt Password Hashing (cost=12)
-  OAuth 2.0 (Google, GitHub)
-  Rate Limiting (120 req/min)
-  CORS Protection
-  Input Validation (Pydantic)
-  HTTPS Only
-  Pre-commit Security Hooks


##  Deployment

### Render.com (Production)
```yaml
# render.yaml - Auto-deploy on git push
services:
  - name: ai-coach-backend
    type: web
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: python run_local.py
    
  - name: ai-coach-frontend
    type: web
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm run start
```

**Live URLs:**
- Frontend: https://ai-coach-frontend-nrqf.onrender.com
- Backend: https://ai-coach-backend-3vlb.onrender.com

##  Documentation & Engineering Quality

| Document / Component | Purpose |
|----------------------|---------|
| `QUALITY_ASSURANCE.md` | Core testing strategies, coverage metrics, and CI gates |
| `backend/tests/` | Pytest suite covering security, edge cases, data integrity |
| `e2e/tests/` | Playwright automated browser tests for CI stability |
| `backend/alembic/` | PostgreSQL schema migrations |
| `.github/workflows/` | GitHub Actions CI/CD pipelines |


##  Roadmap

### Completed ✅
- Authentication (JWT + OAuth)
-  AI 5-Agent Pipeline
-  Voice/Face Analysis
-  Multi-User Rooms
-  3D Immersive UI
-  E2E Testing
-  CI/CD Pipeline
-  Production Deployment

### Upcoming
- [ ] Email Verification
- [ ] Password Reset
- [ ] PDF Report Export
- [ ] Mobile App (React Native)
- [ ] Stripe Payments
- [ ] Admin Dashboard




##  Contributing

```bash
# Fork and clone
git clone https://github.com/yourusername/Articulate_hub.git

# Create branch
git checkout -b feature/amazing-feature

# Make changes and commit
git commit -m "feat: Add amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```


##  License

MIT License - see [LICENSE](LICENSE) file



##  Acknowledgments

- **MediaPipe** for face landmark detection
- **OpenAI** for AI capabilities
- **Render** for hosting
- **FastAPI** & **Next.js** communities


<p align="center">
  <a href="https://ai-coach-frontend-nrqf.onrender.com">Live Demo</a> •
  <a href="https://github.com/Manirider/Articulate_hub">GitHub</a> •
  <a href="mailto:support@aicoach.com">Support</a>
</p>


<p align="center">
  <sub>⭐ Star this repo if you find it helpful!</sub>
</p>
