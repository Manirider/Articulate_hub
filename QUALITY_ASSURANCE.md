# Quality Assurance & Testing Strategy

This document outlines the real, measurable quality assurance processes for the AI Communication Coach platform.

## 1. Testing Philosophy

**REAL testing, REAL coverage, REAL quality.**

- No mock coverage inflation
- No bypassed tests in CI
- No fake AI fallbacks
- All infrastructure tested against real services (PostgreSQL, Redis)

## 2. Testing Frameworks

### Backend (Python/FastAPI)
| Tool | Purpose | Configuration |
|------|---------|---------------|
| `pytest` | Test runner | `pytest.ini` |
| `pytest-asyncio` | Async test support | Configured in conftest |
| `pytest-cov` | Coverage reporting | `--cov=app --cov-fail-under=75` |
| `httpx` | Async HTTP client for API tests | ASGITransport |
| `unittest.mock` | Selective mocking (external APIs only) | `patch` |

### Frontend (Next.js/TypeScript)
| Tool | Purpose |
|------|---------|
| `ESLint` | Static analysis |
| `TypeScript` | Type checking |
| `Playwright` | E2E testing |

## 3. Test Categories

### Unit Tests
- `backend/tests/test_ai_pipeline.py` - AI scoring algorithms
- `backend/tests/test_viva_and_ai.py` - Viva/Q&A module
- Individual service logic testing

### API/Integration Tests
- `backend/tests/test_api.py` - Full API endpoint testing
- Database transaction integrity
- Authentication flows (JWT, OAuth)
- Error handling (400, 401, 403, 404, 503)

### AI Infrastructure Tests
- `backend/tests/test_viva_and_ai.py::TestAIDiagnostics`
- AI health check validation
- Service unavailability handling (503)

## 4. CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/ci.yml`)

#### Services
```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_DB: aicoach_test
  redis:
    image: redis:7
```

#### Jobs
1. **test-and-lint**
   - PostgreSQL + Redis service containers
   - Python 3.13
   - Node.js 20
   - Backend: `pytest --cov=app --cov-fail-under=75`
   - Frontend: `npm run lint && npm run build`
   - Security audit: `npm audit`

2. **security-scan**
   - Bandit Python security scanner
   - Artifact upload of scan results

3. **build-and-push-backend** (main branch only)
   - Container build verification
   - GHCR push

4. **build-and-push-frontend** (main branch only)
   - Container build verification
   - GHCR push

## 5. Local Testing

### Prerequisites
```bash
# Start infrastructure
docker-compose up -d postgres redis

# Or use test containers (CI-style)
```

### Backend Tests
```bash
cd ai-communication-coach/backend

# Install dependencies
pip install -r requirements.txt

# Run all tests with coverage
pytest tests/ -v --tb=short --cov=app --cov-report=term-missing

# Run specific test file
pytest tests/test_viva_and_ai.py -v

# Run with PostgreSQL (production-like)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/aicoach_test pytest tests/
```

### Frontend Tests
```bash
cd ai-communication-coach/frontend

# Install dependencies
npm install

# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Build verification
npm run build
```

### E2E Tests
```bash
cd ai-communication-coach/e2e

# Install dependencies
npm install
npx playwright install

# Run tests
npx playwright test

# View report
npx playwright show-report
```

## 6. Coverage Requirements

| Component | Target | Current |
|-----------|--------|---------|
| Backend API | >75% | Measured in CI |
| Critical paths | >90% | Auth, AI pipeline, DB transactions |
| Viva/Q&A module | >85% | Full coverage required |

## 7. Security Testing

### Automated Scans
- **Bandit**: Python security issues
  ```bash
  bandit -r backend/app -f json -o bandit-report.json
  ```

- **NPM Audit**: Dependency vulnerabilities
  ```bash
  npm audit --audit-level=high
  ```

### Manual Security Review
- Authentication bypass attempts
- SQL injection vectors (parameterized queries only)
- JWT token manipulation
- Rate limiting effectiveness

## 8. AI Infrastructure Testing

### AI Diagnostics
```bash
# Check AI health
curl http://localhost:8000/api/v1/health/ai

# Expected: 503 if not configured, 200 if healthy
```

### Viva/Q&A Module
- **Without AI**: Returns 503 with clear error message
- **With AI**: Returns AI-generated questions and real scoring

## 9. Database Testing

### PostgreSQL (Production)
- Connection pooling validated
- Migration testing with Alembic
- Transaction rollback verification

### Test Isolation
- Each test gets clean database state
- Automatic rollback after each test
- No test data pollution

## 10. Production Readiness Checklist

Before deployment:
- [ ] All tests pass (`pytest`)
- [ ] Coverage >= 75%
- [ ] Security scan clean
- [ ] TypeScript compilation clean
- [ ] Docker builds successful
- [ ] Environment variables validated
- [ ] AI health check passes (if configured)
- [ ] Database migrations applied

## 11. Test Artifacts

### Coverage Reports
- XML: `backend/coverage.xml` (for Codecov)
- HTML: `backend/htmlcov/index.html` (local viewing)

### CI Artifacts
- Bandit security report
- Playwright test results
- Build logs
