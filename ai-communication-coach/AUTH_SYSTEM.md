# AI Communication Coach: Premium Authentication System

## 🎯 Overview

A FAANG-grade authentication system for AI Communication Coach with modern UI, strong security, OAuth integration, and premium UX.

---

## 📐 Architecture

### Backend Stack
- **Framework**: FastAPI (async)
- **Security**: JWT tokens (HS256, 120min expiry)
- **Database**: SQLAlchemy async ORM + SQLite (dev)
- **Password Hashing**: bcrypt via `get_password_hash()`
- **OAuth**: Google OAuth2 + GitHub OAuth2

### Frontend Stack
- **Framework**: Next.js 14+ (App Router, 'use client')
- **Styling**: Tailwind CSS + CSS variables (dark theme)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **OAuth**: @react-oauth/google
- **State**: localStorage (persistent) + sessionStorage (temporary)

---

## 🔐 Authentication Flows

### 1. **Email/Password Signup**
```
POST /api/v1/auth/signup
{
  "email": "user@example.com",
  "full_name": "Jane Smith",
  "password": "StrongPass123"
}
→ 200: { "access_token": "jwt...", "token_type": "bearer" }
→ 409: { "detail": "Email already registered" }
→ 422: { "detail": "Password validation error..." }
```

**Validation:**
- Email: Valid format, normalized to lowercase, max 255 chars
- Full Name: 2-120 chars, normalized whitespace
- Password: 8-128 chars, must contain uppercase, lowercase, number (no spaces)

---

### 2. **Email/Password Login**
```
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "StrongPass123"
}
→ 200: { "access_token": "jwt...", "token_type": "bearer" }
→ 401: { "detail": "Invalid email or password" }
```

---

### 3. **Google OAuth 2.0**
```
Frontend:
1. User clicks "Google" button
2. useGoogleLogin() opens consent screen
3. User grants permission
4. Frontend receives ID token
5. POST /api/v1/auth/google with token

POST /api/v1/auth/google
{
  "token": "google_id_token..."
}
→ 200: { "access_token": "jwt...", "token_type": "bearer" }
→ 401: { "detail": "Google authentication failed" }

Backend:
- Verifies token signature with Google API
- Creates/updates user with email + name
- Returns JWT access token
```

**Setup:**
1. Create OAuth app at [console.developers.google.com](https://console.developers.google.com)
2. Get Client ID
3. Set in `.env` → `GOOGLE_CLIENT_ID`
4. Configure authorized redirect URIs: `http://localhost:3000`

---

### 4. **GitHub OAuth 2.0 (Popup Flow)**
```
Frontend:
1. User clicks "GitHub" button
2. Opens popup to /api/v1/auth/github/start
3. Backend redirects to GitHub authorize endpoint
4. User grants permission
5. GitHub redirects to /api/v1/auth/github/callback
6. Backend exchanges code for access token
7. Backend fetches user email + name from GitHub API
8. Returns HTML popup that posts token message back to opener
9. Opener window receives message and stores token

Backend:
/api/v1/auth/github/start
→ 307 redirect to GitHub authorize endpoint

/api/v1/auth/github/callback?code=...&state=...
→ 200 HTML: Popup returns token via window.postMessage()

Key Security:
- CSRF protection: state parameter in cookie
- Token stored in httpOnly cookie (callback response only)
- 10-minute state expiry
- Popup closes after auth
```

**Setup:**
1. Create OAuth app at [github.com/settings/apps](https://github.com/settings/apps) or [github.com/settings/developers](https://github.com/settings/developers)
2. Get Client ID and Client Secret
3. Set Authorization callback URL: `http://localhost:8000/api/v1/auth/github/callback`
4. Set in `.env`:
   ```
   GITHUB_CLIENT_ID=your_id
   GITHUB_CLIENT_SECRET=your_secret
   GITHUB_REDIRECT_URI=http://localhost:8000/api/v1/auth/github/callback
   ```

---

### 5. **Protected Routes**
```
All protected routes require Authorization header:
GET /api/v1/auth/me
Authorization: Bearer {access_token}

→ 200: {
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Jane Smith",
  "xp": 150,
  "level": 2,
  "streak_days": 5
}
→ 401: { "detail": "Unauthorized" }
```

---

## 💾 Token Management

### Storage Strategy
```javascript
// Frontend: src/services/auth.ts
import { getToken, setToken, clearToken } from '@/services/auth';

// Store token (remember = persistent via localStorage)
setToken(token, remember: boolean);

// Retrieve token (checks sessionStorage first, then localStorage)
const token = getToken();

// Clear both storage locations
clearToken();
```

### Remember Me
- `remember=true` → `localStorage` (persists across browser restart)
- `remember=false` → `sessionStorage` (cleared when tab closes)
- API client reads from either location automatically

### Token Expiry
- Access token: 120 minutes
- No refresh token (short-lived design)
- Expired tokens return 401, user must re-login

---

## 🎨 Frontend UI Components

### Auth Page (`src/app/auth/page.tsx`)

#### Features:
- **Glassmorphism Design**: Frosted glass effect with backdrop blur
- **Dark Theme**: Deep navy background with cyan/violet accents
- **Animated Background**: Floating orbs + grid pattern
- **Smooth Transitions**: Framer Motion animations on all interactions

#### Tabs:
1. **Sign In (Login)**
   - Email input
   - Password input (show/hide toggle)
   - Remember me checkbox
   - Forgot password link
   - Google login button
   - GitHub login button

2. **Sign Up (Registration)**
   - Full name input
   - Email input
   - Password input (show/hide toggle)
   - Confirm password input
   - Password strength meter (5 levels: Very Weak → Very Strong)
   - Real-time validation indicators
   - Terms & Conditions + Privacy Policy checkboxes
   - Google login button
   - GitHub login button

3. **Forgot Password**
   - Email input
   - Reset link sender (placeholder)

#### Validation UI:
- Password strength color: Red (weak) → Yellow → Green (strong) → Cyan (very strong)
- Real-time feedback: 5 rules shown with checkmarks
- Confirm password mismatch indicator
- Form submission disabled until valid

#### Error Handling:
- Toast-style error messages (red border, white text)
- Success messages (green)
- Server timeout hint ("Server waking up...")
- Field-level error hints from backend

#### Loading States:
- Submit button shows spinner + "Please wait..."
- After 5 seconds: "Server waking up..." message
- All buttons disabled during submission

---

## 🛡 Security Features

### Backend
1. **Password Hashing**: bcrypt (cost=12)
2. **CSRF Protection**: State token in secure httpOnly cookie
3. **Email Verification**: Normalizes + validates email format
4. **Rate Limiting**: Configurable per-minute limit (default 120 req/min)
5. **Input Validation**: Pydantic schemas with field-level validation
6. **OAuth State**: 32-byte random state, HMAC'd, 10-min expiry

### Frontend
1. **Secure Storage**: sessionStorage (default) or localStorage (remember me)
2. **XSS Prevention**: React auto-escapes, no dangerouslySetInnerHTML
3. **CSRF**: Relies on backend state validation
4. **Password Requirements**: Enforced client + server side

### Network
1. **HTTPS in Production**: Backend validates https-only secure cookies
2. **CORS**: Configurable origins (default localhost:3000)
3. **OAuth Scopes**: Google (email verified), GitHub (read:user user:email)

---

## 📁 File Structure

```
backend/
├── app/
│   ├── api/v1/routes/auth.py       # OAuth flows + signup/login
│   ├── schemas/auth.py              # Pydantic request/response models
│   ├── core/
│   │   ├── security.py              # JWT + password hashing
│   │   ├── config.py                # Settings (OAuth keys, etc.)
│   │   └── dependencies.py          # get_current_user dependency
│   └── models/user.py               # User SQLAlchemy model
└── tests/test_api.py                # Auth endpoint tests

frontend/
├── src/
│   ├── app/auth/page.tsx            # Auth UI (login/signup/forgot)
│   ├── services/
│   │   ├── api.ts                   # HTTP client with auth header
│   │   └── auth.ts                  # Token storage helpers
│   ├── hooks/useAuth.ts             # useAuth() hook + cache
│   └── components/Navbar.tsx        # Logout button
└── .env.example                     # NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

---

## 🚀 Setup & Deployment

### Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
export GOOGLE_CLIENT_ID="your_google_id"
export GITHUB_CLIENT_ID="your_github_id"
export GITHUB_CLIENT_SECRET="your_github_secret"
python run_local.py  # or: uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" > .env.local
echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_id" >> .env.local
npm run dev
```

Visit: `http://localhost:3000/auth`

---

### Production (Render.yaml)
```yaml
services:
  - name: backend
    env:
      GOOGLE_CLIENT_ID: (set in Render dashboard)
      GITHUB_CLIENT_ID: (set in Render dashboard)
      GITHUB_CLIENT_SECRET: (set in Render dashboard)
      FRONTEND_URL: https://your-app.onrender.com
      
  - name: frontend
    env:
      NEXT_PUBLIC_API_BASE_URL: https://your-backend.onrender.com
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: (set in Render dashboard)
```

---

## 🧪 Testing

### Backend Auth Tests
```bash
cd backend
pytest tests/test_api.py::test_signup_and_login -v
pytest tests/test_api.py::test_duplicate_signup_returns_409 -v
pytest tests/test_api.py::test_invalid_login -v
pytest tests/test_api.py::test_signup_rejects_weak_password -v
```

### Frontend Type Check
```bash
cd frontend
npx tsc --noEmit
```

---

## 📋 API Reference

### Auth Endpoints

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/api/v1/auth/signup` | None | email, full_name, password | access_token |
| POST | `/api/v1/auth/login` | None | email, password | access_token |
| POST | `/api/v1/auth/google` | None | token | access_token |
| GET | `/api/v1/auth/github/start` | None | - | 307 redirect |
| GET | `/api/v1/auth/github/callback` | None | code, state | HTML popup |
| GET | `/api/v1/auth/me` | JWT | - | user profile |

---

## 🎯 Next Steps

### Potential Enhancements
1. **Email Verification**: Send confirmation email on signup
2. **Refresh Tokens**: 7-day refresh + 15-min access token
3. **2FA**: TOTP/SMS two-factor authentication
4. **Social Profiles**: Link multiple OAuth providers to one account
5. **Password Reset**: Email-based password reset flow
6. **Account Deletion**: GDPR-compliant account + data deletion
7. **Session Management**: Device list, revoke sessions
8. **Rate Limiting**: Per-user + per-IP limits
9. **Audit Logging**: Track login/logout/OAuth events
10. **Magic Links**: Passwordless authentication

---

## 🐛 Troubleshooting

### "Email already registered"
- Email is already in use
- Solution: Login instead or use a different email

### "Password must contain uppercase, lowercase, and number"
- Password doesn't meet complexity requirements
- Solution: Update password to include: UPPERCASE + lowercase + number

### "Passwords do not match"
- Confirm password field doesn't match password field
- Solution: Re-enter both passwords

### "Google login failed"
- Incorrect Client ID or CORS origin
- Solution: Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local`

### "GitHub login failed"
- Incorrect Client ID/Secret or redirect URI
- Solution: Verify GitHub OAuth app settings in [github.com/settings/developers](https://github.com/settings/developers)

### "Unauthorized" on protected routes
- Token is invalid or expired
- Solution: Login again to get fresh token

---

## 📞 Support

For issues or feature requests, check:
- Backend logs: `python run_local.py`
- Frontend console: DevTools → Console
- Network requests: DevTools → Network tab
