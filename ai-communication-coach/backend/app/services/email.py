"""Email service for sending password reset and other notifications."""
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_password_reset_email(email: str, full_name: str, reset_url: str) -> bool:
    """Send password reset email using Resend API."""
    try:
        # Check if Resend API key is configured
        resend_api_key = getattr(settings, 'resend_api_key', None)
        
        if not resend_api_key or resend_api_key.startswith('YOUR_'):
            raise RuntimeError("RESEND_API_KEY not configured. Email service unavailable.")
        
        # Send email via Resend API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "AI Communication Coach <noreply@aicoach.app>",
                    "to": email,
                    "subject": "Reset Your Password - AI Communication Coach",
                    "html": _get_password_reset_html(full_name, reset_url),
                    "text": _get_password_reset_text(full_name, reset_url)
                }
            )
            
            if response.status_code == 200:
                logger.info(f"Password reset email sent to {email}")
                return True
            else:
                logger.error(f"Failed to send email: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error sending password reset email: {e}")
        return False


def _get_password_reset_html(full_name: str, reset_url: str) -> str:
    """Generate HTML email template for password reset."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .container {{
            background: #f9fafb;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
        }}
        .logo {{
            font-size: 24px;
            font-weight: bold;
            color: #06b6d4;
            margin-bottom: 24px;
        }}
        h1 {{
            color: #111827;
            font-size: 24px;
            margin-bottom: 16px;
        }}
        p {{
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 24px;
        }}
        .button {{
            display: inline-block;
            background: linear-gradient(135deg, #06b6d4, #3b82f6);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 16px 0;
        }}
        .link {{
            color: #6b7280;
            font-size: 14px;
            word-break: break-all;
            margin-top: 24px;
        }}
        .footer {{
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            color: #9ca3af;
            font-size: 14px;
        }}
        .warning {{
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            margin: 24px 0;
            text-align: left;
            font-size: 14px;
            color: #92400e;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎯 AI Communication Coach</div>
        <h1>Hello, {full_name}!</h1>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="{reset_url}" class="button">Reset Password</a>
        <div class="warning">
            <strong>⚠️ Important:</strong> This link expires in 1 hour and can only be used once.
        </div>
        <p class="link">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <code>{reset_url}</code>
        </p>
        <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>© 2026 AI Communication Coach. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""


def _get_password_reset_text(full_name: str, reset_url: str) -> str:
    """Generate plain text email template for password reset."""
    return f"""Hello {full_name}!

We received a request to reset your password for AI Communication Coach.

Click the link below to reset your password:
{reset_url}

⚠️ This link expires in 1 hour and can only be used once.

If you didn't request a password reset, you can safely ignore this email.

© 2026 AI Communication Coach. All rights reserved.
"""


async def send_welcome_email(email: str, full_name: str) -> bool:
    """Send welcome email to new users."""
    try:
        resend_api_key = getattr(settings, 'resend_api_key', None)
        
        if not resend_api_key or resend_api_key.startswith('YOUR_'):
            raise RuntimeError("RESEND_API_KEY not configured. Email service unavailable.")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "AI Communication Coach <noreply@aicoach.app>",
                    "to": email,
                    "subject": "Welcome to AI Communication Coach! 🎉",
                    "html": _get_welcome_html(full_name),
                    "text": _get_welcome_text(full_name)
                }
            )
            
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Error sending welcome email: {e}")
        return False


def _get_welcome_html(full_name: str) -> str:
    """Generate HTML welcome email."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to AI Communication Coach</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .container {{
            background: #f9fafb;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
        }}
        .logo {{
            font-size: 24px;
            font-weight: bold;
            color: #06b6d4;
            margin-bottom: 24px;
        }}
        h1 {{
            color: #111827;
            font-size: 28px;
            margin-bottom: 16px;
        }}
        .subtitle {{
            color: #6b7280;
            font-size: 18px;
            margin-bottom: 24px;
        }}
        .features {{
            text-align: left;
            background: white;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }}
        .feature {{
            display: flex;
            align-items: center;
            margin: 16px 0;
            font-size: 16px;
        }}
        .feature-icon {{
            font-size: 24px;
            margin-right: 12px;
        }}
        .button {{
            display: inline-block;
            background: linear-gradient(135deg, #06b6d4, #3b82f6);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 16px 0;
        }}
        .footer {{
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            color: #9ca3af;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎯 AI Communication Coach</div>
        <h1>Welcome, {full_name}! 🎉</h1>
        <p class="subtitle">Your journey to confident communication starts now.</p>
        
        <div class="features">
            <div class="feature">
                <span class="feature-icon">🤖</span>
                <span><strong>AI-Powered Coaching</strong> - Get real-time feedback on your speaking skills</span>
            </div>
            <div class="feature">
                <span class="feature-icon">📊</span>
                <span><strong>Track Progress</strong> - Monitor your improvement with detailed analytics</span>
            </div>
            <div class="feature">
                <span class="feature-icon">🏆</span>
                <span><strong>Earn Achievements</strong> - Level up and unlock new challenges</span>
            </div>
            <div class="feature">
                <span class="feature-icon">👥</span>
                <span><strong>Practice Together</strong> - Join group sessions and learn from peers</span>
            </div>
        </div>
        
        <a href="{settings.frontend_url}/dashboard" class="button">Start Your First Session</a>
        
        <div class="footer">
            <p>Need help? Reply to this email or contact our support team.</p>
            <p>© 2026 AI Communication Coach. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""


def _get_welcome_text(full_name: str) -> str:
    """Generate plain text welcome email."""
    return f"""Welcome to AI Communication Coach, {full_name}! 🎉

Your journey to confident communication starts now.

Here's what you can do:
• 🤖 AI-Powered Coaching - Get real-time feedback on your speaking skills
• 📊 Track Progress - Monitor your improvement with detailed analytics  
• 🏆 Earn Achievements - Level up and unlock new challenges
• 👥 Practice Together - Join group sessions and learn from peers

Get started: {settings.frontend_url}/dashboard

Need help? Reply to this email or contact our support team.

© 2026 AI Communication Coach. All rights reserved.
"""
