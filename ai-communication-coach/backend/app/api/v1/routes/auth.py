from datetime import timedelta
import json
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import GoogleLoginRequest, LoginRequest, SignUpRequest, TokenResponse, UserResponse

router = APIRouter()


def _github_oauth_enabled() -> bool:
        values = (
                settings.github_client_id,
                settings.github_client_secret,
                settings.github_redirect_uri,
                settings.frontend_url,
        )
        return all(value and not value.startswith("YOUR_") for value in values)


def _github_auth_url(state: str) -> str:
        params = urlencode(
                {
                        "client_id": settings.github_client_id,
                        "redirect_uri": settings.github_redirect_uri,
                        "scope": "read:user user:email",
                        "state": state,
                        "allow_signup": "true",
                }
        )
        return f"https://github.com/login/oauth/authorize?{params}"


def _oauth_popup_html(access_token: str) -> HTMLResponse:
        payload = json.dumps({"type": "oauth-token", "token": access_token})
        frontend_origin = json.dumps(settings.frontend_url.rstrip("/"))
        html = f"""<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Authentication complete</title>
        <style>
            body {{
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                background: #050810;
                color: #e2e8f0;
                font-family: Inter, system-ui, sans-serif;
            }}
            .card {{
                padding: 24px 28px;
                border-radius: 20px;
                background: rgba(17, 24, 39, 0.9);
                border: 1px solid rgba(148, 163, 184, 0.16);
                box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="card">Authentication complete. You can close this window.</div>
        <script>
            (function() {{
                const message = {payload};
                const origin = {frontend_origin};
                if (window.opener) {{
                    window.opener.postMessage(message, origin);
                    window.close();
                }}
            }})();
        </script>
    </body>
</html>"""
        response = HTMLResponse(content=html)
        response.headers["Cache-Control"] = "no-store"
        return response


async def _github_user_email(client: httpx.AsyncClient, access_token: str) -> tuple[str, str]:
        headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": settings.app_name,
        }

        user_response = await client.get("https://api.github.com/user", headers=headers)
        user_response.raise_for_status()
        user_data = user_response.json()

        email = user_data.get("email")
        if not email:
                emails_response = await client.get("https://api.github.com/user/emails", headers=headers)
                emails_response.raise_for_status()
                for candidate in emails_response.json():
                        if candidate.get("primary") and candidate.get("verified"):
                                email = candidate.get("email")
                                break

        if not email:
                raise ValueError("GitHub account does not expose a verified email address")

        display_name = user_data.get("name") or user_data.get("login") or email.split("@")[0]
        return email.lower(), display_name


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: SignUpRequest, db: AsyncSession = Depends(get_db)):
    # Normalize and validate
    email = payload.email.lower()
    
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already registered. Please sign in or use a different email."
        )

    try:
        user = User(
            email=email,
            full_name=payload.full_name,
            hashed_password=get_password_hash(payload.password),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        token = create_access_token(str(user.id), timedelta(minutes=settings.access_token_expire_minutes))
        return TokenResponse(access_token=token)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Signup failed. Please try again.")


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        # Don't leak whether the email exists
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials and try again."
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials and try again."
        )

    token = create_access_token(str(user.id), timedelta(minutes=settings.access_token_expire_minutes))
    return TokenResponse(access_token=token)


@router.post("/google", response_model=TokenResponse)
async def google_login(payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        idinfo = id_token.verify_oauth2_token(
            payload.token, google_requests.Request(), settings.google_client_id
        )

        email = idinfo.get("email")
        if not email or not idinfo.get("email_verified"):
            raise ValueError("Google account email is missing or unverified")

        email = email.lower()
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                email=email,
                full_name=idinfo.get("name", "Google User"),
                hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        token = create_access_token(str(user.id), timedelta(minutes=settings.access_token_expire_minutes))
        return TokenResponse(access_token=token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google authentication failed")


@router.get("/github/start")
async def github_start() -> RedirectResponse:
    if not _github_oauth_enabled():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub OAuth is not configured")

    state = secrets.token_urlsafe(32)
    response = RedirectResponse(url=_github_auth_url(state), status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    response.set_cookie(
        key="github_oauth_state",
        value=state,
        httponly=True,
        secure=settings.environment.lower() == "production",
        samesite="lax",
        max_age=600,
        path="/api/v1/auth/github",
    )
    response.headers["Cache-Control"] = "no-store"
    return response


@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    if not _github_oauth_enabled():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub OAuth is not configured")

    cookie_state = request.cookies.get("github_oauth_state")
    if not code or not state or not cookie_state or state != cookie_state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid GitHub OAuth state")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                    "redirect_uri": settings.github_redirect_uri,
                    "state": state,
                },
                headers={"Accept": "application/json", "User-Agent": settings.app_name},
            )
            token_response.raise_for_status()
            token_payload = token_response.json()

            github_token = token_payload.get("access_token")
            if not github_token:
                raise ValueError(token_payload.get("error_description") or "GitHub token exchange failed")

            email, display_name = await _github_user_email(client, github_token)

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                email=email,
                full_name=display_name,
                hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        token = create_access_token(str(user.id), timedelta(minutes=settings.access_token_expire_minutes))
        response = _oauth_popup_html(token)
        response.delete_cookie("github_oauth_state", path="/api/v1/auth/github")
        return response
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    except httpx.HTTPError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="GitHub authentication failed")
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="GitHub authentication failed")



@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        xp=current_user.xp,
        level=current_user.level,
        streak_days=current_user.streak_days,
    )
