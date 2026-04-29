# AI Communication Coach

Production-grade local-first SaaS platform for communication training with AI-powered realtime coaching.

## Tech Stack
- Frontend: Next.js 14, TypeScript, Tailwind CSS, Socket.IO client
- Backend: FastAPI, SQLAlchemy (async), JWT auth, Socket.IO server
- AI Pipeline: Whisper-compatible transcription, NLP/behavior analysis, multi-agent orchestration
- Data: PostgreSQL (required), Redis (optional)

## Local Development

### 1) Start infrastructure
```bash
docker compose up -d postgres redis
```

### 2) Backend setup
```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy ..\\.env.example .env
uvicorn app.main:app --reload --port 8000
```

### 3) Frontend setup
```bash
cd frontend
npm install
copy ..\\.env.example .env.local
npm run dev
```

Open http://localhost:3000

## Product Flow
1. Splash screen with animated avatar intro
2. Auth + About split screen
3. Dashboard with modules and stats
4. Module -> Submodule -> Session -> Analysis -> Feedback -> Analytics

## Modules
- Group Discussion
- Debate
- Presentation
- JAM
- Interview

Each module includes:
- Demo Mode
- Personal Practice
- AI Mode
- Friends Mode

## Backend API (v1)
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `GET /api/v1/modules`
- `POST /api/v1/sessions`
- `POST /api/v1/sessions/{session_id}/transcript`
- `POST /api/v1/sessions/{session_id}/complete`
- `GET /api/v1/analytics/overview`
- `GET /api/v1/health`

## Realtime Events (Socket.IO)
- `join_session`
- `transcript_chunk`
- `live_feedback`
- `session_completed`

## Phase Plan
See [docs/phases.md](docs/phases.md).

## Testing
```bash
cd backend
pytest -q
```

## Security
- Password hashing with bcrypt
- JWT access tokens
- Input validation with Pydantic
- Basic rate limiting middleware

## Notes
- The AI pipeline includes deterministic local heuristics by default plus optional LLM enhancements.
- For production, replace local storage with object storage and configure managed secrets.
