# Quality Assurance Guide

> Engineering standards, testing procedures, and quality gates for the AI Communication Coach platform.

---

## 🧪 Testing

### Backend Tests (pytest)

```bash
cd backend

# Run all tests with coverage
pytest

# Run with verbose output
pytest -v --tb=long

# Run specific test categories
pytest -m security      # Security tests only
pytest -m integration   # Integration tests
pytest -m performance   # Performance benchmarks

# Run a single test file
pytest tests/test_api.py -v
```

### Test Coverage

| Metric | Target | Gate |
|--------|--------|------|
| Line coverage | 80%+ | CI fails below 80% |
| Branch coverage | Tracked | Not gated |

Coverage reports are generated automatically:
- **Terminal**: `--cov-report=term-missing`
- **HTML**: `backend/htmlcov/index.html`
- **XML**: `backend/coverage.xml` (for CI/Codecov)

### Frontend Checks

```bash
cd frontend

# Lint (ESLint)
npm run lint

# TypeScript type check
npx tsc --noEmit

# Production build verification
npm run build
```

### End-to-End Tests (Playwright)

```bash
cd e2e

# Install browsers
npx playwright install --with-deps

# Run all E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Generate HTML report
npx playwright show-report
```

---

## 🔒 Security

### Automated Scans

| Tool | Purpose | Runs In |
|------|---------|---------|
| **Bandit** | Python security linting | CI (every push) |
| **npm audit** | Dependency vulnerability check | CI (every push) |
| **ESLint security rules** | Frontend code patterns | CI (every push) |

### Manual Security Checklist

- [ ] JWT secret is not default (`change_me`)
- [ ] bcrypt rounds ≥ 12 for production
- [ ] CORS origins restricted (not `*`) in production
- [ ] Debug endpoints disabled in production
- [ ] Rate limiting enabled
- [ ] Input validation on all user inputs (Pydantic)
- [ ] SQL injection prevention (SQLAlchemy ORM)
- [ ] XSS prevention (React auto-escaping)

---

## 🏗️ Code Quality

### Linting & Formatting

```bash
# Backend
cd backend
pip install ruff
ruff check app/     # Lint
ruff format app/    # Format

# Frontend
cd frontend
npm run lint        # ESLint
```

### Pre-commit Hooks

The project includes `.pre-commit-config.yaml` for automated checks:

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

---

## 📊 CI/CD Pipeline

### Pipeline Architecture

```
Push/PR → backend-test → frontend-build → e2e-tests → build-and-push
                ↓               ↓
        security-scan    (parallel)
```

### Quality Gates

| Gate | Threshold | Blocks Merge |
|------|-----------|-------------|
| Backend tests | All pass | ✅ |
| Coverage | ≥ 80% | ✅ |
| Frontend lint | All pass | ✅ |
| TypeScript check | No errors | ✅ |
| Frontend build | Succeeds | ✅ |
| Playwright E2E | All pass | ✅ |
| Security scan | Report generated | ⚠️ Advisory |
| npm audit | High severity | ⚠️ Advisory |

### Artifacts Generated

| Artifact | Format | Location |
|----------|--------|----------|
| Backend coverage | HTML + XML | `backend/htmlcov/` |
| Playwright report | HTML | `e2e/playwright-report/` |
| Security scan | JSON | `bandit-report.json` |

---

## 🔍 Monitoring (Production)

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/health` | Comprehensive health check |
| `GET /api/v1/health/ready` | Kubernetes readiness probe |
| `GET /api/v1/health/live` | Kubernetes liveness probe |
| `GET /api/v1/health/metrics` | Performance metrics |
| `GET /api/v1/health/ai` | AI infrastructure diagnostics |
| `GET /api/v1/health/circuit-breakers` | Circuit breaker status |

### Observability Stack

| Service | Purpose |
|---------|---------|
| **Sentry** | Error tracking & alerting |
| **OpenTelemetry** | Distributed tracing |
| **structlog** | Structured JSON logging |

---

## 📋 Release Checklist

Before deploying to production:

1. **All CI checks pass** (green pipeline)
2. **Coverage ≥ 80%** (verified in CI)
3. **No high-severity vulnerabilities** (Bandit + npm audit)
4. **Environment variables configured** (see `env.example`)
5. **JWT_SECRET rotated** (not default value)
6. **Database migrations applied** (Alembic)
7. **Redis accessible** (health check passes)
8. **AI services validated** (`/api/v1/health/ai`)
