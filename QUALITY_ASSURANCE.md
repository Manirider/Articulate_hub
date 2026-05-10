# Quality Assurance & Testing Strategy

This document outlines the real, measurable quality assurance processes for the AI Communication Coach platform.

## 1. Testing Frameworks
- **Backend:** `pytest`, `pytest-cov`, `flake8`, `black`
- **Frontend:** `jest`, `@testing-library/react`, `eslint`, `prettier`
- **End-to-End:** Playwright

## 2. CI/CD Pipeline Checks
All pull requests and commits to `main` must pass the following automated checks:
- **Linting:** Frontend (ESLint/TypeScript) and Backend (Flake8/Black)
- **Security:** Trivy and CodeQL vulnerability scans
- **Unit & API Tests:** Complete backend test suite execution
- **E2E Tests:** Playwright tests across multiple browsers

## 3. Test Coverage Requirements
- Backend code must maintain >80% code coverage.
- PRs will fail if coverage drops below the baseline.
- Focus areas: Auth endpoints, AI scoring logic, Database transactions.

## 4. Local Execution
To run tests locally:
\`\`\`bash
# Backend
cd ai-communication-coach/backend
pytest --cov=app tests/

# Frontend
cd ai-communication-coach/frontend
npm run lint

# E2E
cd ai-communication-coach/e2e
npx playwright test
\`\`\`

## 5. Security & Validation
- Environment variables are strictly validated on application startup.
- All endpoints use dependency injection for authentication and database sessions.
- Rate limiting is enforced on all API routes.
