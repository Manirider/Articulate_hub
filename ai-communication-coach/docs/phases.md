# Development Strategy (Local-First)

## Phase 1: Project setup + architecture
- Monorepo scaffold with frontend/backend/database/docs/tests
- Shared env model
- Docker compose for local PostgreSQL + Redis

## Phase 2: Authentication system
- Email/password auth
- JWT login/session
- Password hashing and protected routes

## Phase 3: Dashboard UI
- SaaS dashboard cards, trends, progress indicators
- Module navigation and stats cards

## Phase 4: Module system
- Module -> submodule flow
- Demo, Personal, AI, Friends modes
- Session bootstrap and state persistence

## Phase 5: Realtime communication
- Socket.IO event bus for live sessions
- Transcript chunk stream and observer feedback

## Phase 6: AI pipeline (speech + NLP)
- Whisper-compatible transcription endpoint
- NLP + behavioral scoring pipeline
- Explainable score breakdown

## Phase 7: AI avatar integration
- Browser speech synthesis avatar output
- Live conversational prompts

## Phase 8: Analytics + gamification
- Score history trends
- XP, levels, leaderboard seeds

## Phase 9: Testing + optimization
- Unit tests, API tests, integration paths
- Async performance checks and hardening

## Phase 10: Deployment preparation
- Containerization notes
- Environment hardening checklist
- CI/CD and observability plan
