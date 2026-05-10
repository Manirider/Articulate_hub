# AI Communication Coach 🤖🎤

[![Status](https://img.shields.io/badge/status-production%20ready-success)](../QUALITY_ASSURANCE.md)
[![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20FastAPI%20%7C%20AI-blue)](https://github.com/yourusername/ai-communication-coach)
[![License](https://img.shields.io/badge/license-MIT-green)]()

> **Production-grade AI SaaS platform for communication training with real-time coaching, multi-modal analysis, and gamified progression.**

[📊 Quality Assurance](../QUALITY_ASSURANCE.md) | [🚀 Deployment Guide](./DEPLOYMENT_GUIDE.md) | [📖 Documentation](./docs/)

---

## ✨ Features

### 🎯 Core Capabilities
- **Voice Analysis** — Real-time speech recognition with Web Audio API pitch/energy detection
- **Face Analysis** — MediaPipe 478-point face landmark detection for eye contact, head pose, expressions
- **AI Coaching** — 5-agent orchestration (Conversation, Observer, Evaluator, Feedback, Psychology)
- **Multi-Modal Scoring** — Weighted fusion of voice (40%), face (40%), content (20%)
- **Real-time Feedback** — Live tips during sessions via Socket.IO
- **Multi-User Rooms** — WebRTC video/audio with AI observer for group sessions

### 🏗️ Training Modules
| Module | Description | Modes |
|--------|-------------|-------|
| **Group Discussion** | Collaborative discourse practice | Demo, Personal, AI, Friends |
| **Debate** | Argumentation and rebuttal skills | Demo, Personal, AI, Friends |
| **Presentation** | Public speaking with structure | Demo, Personal, AI, Friends |
| **JAM** | Just A Minute — fluency challenge | Demo, Personal, AI, Friends |
| **Interview** | Behavioral & technical prep | Demo, Personal, AI, Friends |

### 🎮 Gamification
- XP system with level progression
- Daily streak tracking
- Achievement badges (8 types)
- Global leaderboard with podium
- Team/organization support

### 📊 Analytics
- Score trends over time
- Skill radar chart (4 dimensions)
- Per-session detailed reports
- Performance history

---

## 🚀 Quick Start

### Docker (Recommended)
```bash
git clone https://github.com/yourusername/ai-communication-coach.git
cd ai-communication-coach
docker-compose up -d

# Access at http://localhost:3000
```

### Manual Setup
```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python run_local.py

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

See [Deployment Guide](./DEPLOYMENT_GUIDE.md) for production setup.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │   Pages     │ │ Components  │ │  Custom Hooks   │   │
│  │  (App Router)│ │ (React)    │ │ (WebRTC/AI)     │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ Socket.IO / REST / WebRTC
┌────────────────────────┴────────────────────────────────┐
│                  Backend (FastAPI)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │   Auth      │ │ AI Pipeline │ │  Real-time      │   │
│  │  (JWT/OAuth)│ │ (5 Agents)  │ │  (Socket.IO)    │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│              Data Layer (PostgreSQL/SQLite)            │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS Variables
- **Animations:** Framer Motion, GSAP
- **3D Graphics:** Three.js / React Three Fiber
- **Charts:** Recharts
- **Real-time:** Socket.IO Client

### Backend
- **Framework:** FastAPI (async)
- **ORM:** SQLAlchemy 2.0 (async)
- **Auth:** JWT + bcrypt + OAuth (Google/GitHub)
- **Real-time:** Socket.IO (async)
- **AI Pipeline:** Custom 5-agent orchestrator
- **Validation:** Pydantic

### AI/ML
- **Face Analysis:** MediaPipe Face Landmarker (478 landmarks)
- **Voice Analysis:** Web Audio API + Autocorrelation pitch detection
- **NLP:** Heuristic-based + Optional LLM (Ollama/OpenAI)
- **Multi-modal Fusion:** Weighted scoring engine

### Infrastructure
- **Database:** PostgreSQL (production) / SQLite (dev)
- **Cache:** Redis (optional)
- **LLM:** Ollama (local) / OpenAI (cloud)
- **Deployment:** Docker, Render.com

---

## 📁 Project Structure

```
ai-communication-coach/
├── backend/
│   ├── app/
│   │   ├── api/v1/routes/      # API endpoints
│   │   ├── models/             # Database models
│   │   ├── services/
│   │   │   ├── ai_pipeline/    # AI analysis engines
│   │   │   │   ├── analyzer.py       # NLP scoring
│   │   │   │   ├── vision_analyzer.py # Face metrics
│   │   │   │   ├── multimodal_fusion.py # Score fusion
│   │   │   │   └── room_analyzer.py   # Multi-user
│   │   │   └── agents/
│   │   │       └── orchestrator.py    # 5-agent pipeline
│   │   ├── core/               # Config, security, rate limit
│   │   └── db/                 # Database setup
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js pages
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom hooks
│   │   │   ├── useWebRTC.ts
│   │   │   ├── useMediaPipe.ts
│   │   │   ├── useVoiceAnalysis.ts
│   │   │   └── useAuth.ts
│   │   └── services/           # API & Socket clients
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml          # Local development
├── render.yaml                 # Production deployment
└── README.md
```

---

## 🔐 Security Features

- ✅ Password hashing (bcrypt, cost=12)
- ✅ JWT authentication (HS256, 120min expiry)
- ✅ OAuth 2.0 (Google, GitHub)
- ✅ CORS protection
- ✅ Rate limiting (120 req/min)
- ✅ Input validation (Pydantic)
- ✅ CSRF protection (OAuth state)
- ✅ Secure headers (CSP, HSTS via nginx)

---

## 📊 API Endpoints

### Authentication
```
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/google
GET  /api/v1/auth/github/start
GET  /api/v1/auth/github/callback
GET  /api/v1/auth/me
```

### Sessions
```
POST /api/v1/sessions
POST /api/v1/sessions/{id}/transcript
POST /api/v1/sessions/{id}/complete
```

### Rooms
```
POST /api/v1/rooms
POST /api/v1/rooms/join
GET  /api/v1/rooms/{id}
POST /api/v1/rooms/{id}/start
POST /api/v1/rooms/{id}/complete
```

### Analytics
```
GET /api/v1/analytics/overview
GET /api/v1/analytics/leaderboard
```

Full API documentation at `/docs` when running backend.

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest -q

# Frontend type check
cd frontend
npx tsc --noEmit

# Production build test
cd frontend
npm run build
```

---

## 📈 Performance

| Metric | Target | Status |
|--------|--------|--------|
| First Load JS | < 100 KB | ✅ 87.5 KB |
| API Latency (p95) | < 500ms | ✅ ~200ms |
| Face Detection | 15 FPS | ✅ |
| Voice Analysis | 1s intervals | ✅ |
| Build Time | < 60s | ✅ ~45s |

---

## 🌟 Roadmap

### Completed ✅
- [x] 5 Training Modules
- [x] 5 AI Agents
- [x] Multi-modal Analysis
- [x] WebRTC Multi-user Rooms
- [x] Gamification System
- [x] Analytics Dashboard
- [x] Team Support
- [x] OAuth Authentication

### Planned 📅
- [ ] Mobile App (React Native)
- [ ] Video Recording
- [ ] AI Model Fine-tuning
- [ ] Push Notifications
- [ ] White-label Support

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

- MediaPipe for face tracking
- FastAPI for the excellent async framework
- Next.js team for the App Router
- OpenAI/Gladia for AI service options

---

**Built with ❤️ for better communication.**

[⬆ Back to Top](#ai-communication-coach-)
