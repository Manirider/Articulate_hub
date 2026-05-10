# GDPR Compliance & Data Protection

## Overview

This document outlines how the AI Communication Coach platform complies with the General Data Protection Regulation (GDPR).

**Last Updated:** May 10, 2026  
**Data Protection Officer:** contact@aicoach.com  
**Version:** 1.0

---

## Data We Collect

### Personal Data
| Data Type | Purpose | Legal Basis | Retention |
|-----------|---------|-------------|-----------|
| **Email Address** | Authentication, communication | Consent | Until account deletion |
| **Full Name** | User identification | Consent | Until account deletion |
| **Password Hash** | Authentication | Legitimate interest | Until account deletion |
| **Session Recordings** | AI analysis & feedback | Consent | 30 days |
| **Transcripts** | Performance tracking | Consent | 2 years |
| **Analytics Data** | Platform improvement | Legitimate interest | 2 years |
| **OAuth Tokens** | Third-party auth | Consent | Until logout/revocation |

### Special Categories
- **Voice recordings** - Audio data for analysis
- **Video recordings** - Optional for facial analysis
- **Performance metrics** - Communication skill data

---

## User Rights (GDPR Articles 15-22)

### 1. Right to Access (Article 15)
Users can request a copy of all their personal data:

```bash
GET /api/v1/user/data-export
```

Response includes:
- Account information
- Session history
- Transcripts
- Analytics
- Settings

### 2. Right to Rectification (Article 16)
Users can update their information:
- Profile editing in settings
- Email: support@aicoach.com

### 3. Right to Erasure (Article 17 - "Right to be Forgotten")
Users can delete their account:

```bash
DELETE /api/v1/user/account
```

**Deletion Process:**
1. Immediate soft delete (flag as deleted)
2. 30-day grace period (can be restored)
3. Hard delete after 30 days:
   - User data removed from database
   - Session recordings deleted
   - Transcripts anonymized
   - Analytics aggregated (no personal identifiers)

### 4. Right to Restriction (Article 18)
Users can temporarily restrict processing:
- Pause data collection
- Session analysis suspended

### 5. Right to Data Portability (Article 20)
Export data in machine-readable format (JSON):

```bash
GET /api/v1/user/export-json
```

### 6. Right to Object (Article 21)
Users can object to:
- Marketing communications (none sent)
- Analytics processing
- AI model training using their data

### 7. Rights Related to Automated Decision Making (Article 22)
- AI feedback is **not** solely automated
- Human review available on request
- Users can contest AI assessments

---

## Data Retention Policies

### Automatic Deletion Schedule

| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| **Session Recordings** | 30 days | Secure deletion (overwritten) |
| **Transcripts** | 2 years | Anonymization after 2 years |
| **User Analytics** | 2 years | Aggregation (no PII) |
| **Password Reset Tokens** | 1 hour | Automatic expiration |
| **Email Verification** | 24 hours | Automatic expiration |
| **Deleted Accounts** | 30 days (grace) → permanent | Hard delete |
| **API Logs** | 90 days | Automatic purge |
| **Error Logs** | 30 days | Sanitized (no PII) |

### Implementation

```python
# Celery task for data cleanup
@celery_app.task(queue='gdpr')
def enforce_data_retention():
    """Enforce GDPR data retention policies."""
    
    # 1. Delete old session recordings
    # 2. Anonymize transcripts >2 years
    # 3. Purge deleted accounts after 30-day grace
    # 4. Clear expired tokens
    # 5. Clean API logs
```

---

## Technical & Organizational Measures (Article 32)

### Security Measures

1. **Encryption**
   - Data at rest: AES-256 (PostgreSQL TDE)
   - Data in transit: TLS 1.3
   - Passwords: bcrypt (12 rounds)

2. **Access Control**
   - Role-based access (RBAC)
   - JWT tokens with short expiry
   - API rate limiting
   - IP-based restrictions for admin

3. **Pseudonymization**
   - User IDs (UUIDs) separate from PII
   - Analytics use aggregated data
   - Logs sanitized of PII

4. **Monitoring**
   - Access logging
   - Breach detection (Sentry)
   - Regular security audits

5. **Data Minimization**
   - Only collect necessary data
   - Opt-in for video recording
   - Granular consent for AI training

### Organizational Measures

| Measure | Implementation |
|---------|---------------|
| **Staff Training** | Annual GDPR training |
| **DPO Contact** | dpo@aicoach.com |
| **Breach Response** | 72-hour notification procedure |
| **Vendor Management** | DPA with all subprocessors |
| **Privacy by Design** | Default privacy settings |
| **PIA** | Privacy Impact Assessment for features |

---

## Subprocessors & Third Parties

| Vendor | Purpose | Location | GDPR Compliance |
|--------|---------|----------|-----------------|
| **Render.com** | Hosting | USA | DPA signed |
| **OpenAI** | AI processing | USA | DPA + Data Processing |
| **Gladia** | Transcription | EU | GDPR compliant |
| **Google** | OAuth | USA | DPA signed |
| **GitHub** | OAuth | USA | DPA signed |

---

## Data Breach Response

### Incident Response Plan

**Detection:**
- Sentry alerts for anomalies
- Automated breach detection
- User reports

**Assessment (0-24 hours):**
1. Identify scope
2. Determine affected users
3. Assess risk level

**Notification (24-72 hours):**
- **Supervisory Authority:** Within 72 hours if high risk
- **Affected Users:** Without undue delay if high risk
- **Documentation:** All breaches logged

**Remediation:**
1. Contain breach
2. Eradicate cause
3. Recover systems
4. Post-incident review

---

## Cookie Policy

### Essential Cookies
| Cookie | Purpose | Duration |
|--------|---------|----------|
| `session` | Authentication | Session |
| `csrf_token` | Security | Session |
| `preferences` | UI settings | 1 year |

### Analytics Cookies
- **Google Analytics:** Opt-in only
- **Mixpanel:** Opt-in only

### Cookie Consent
- Banner on first visit
- Granular controls
- Withdraw consent anytime

---

## Contact Information

**Data Protection Officer:**  
Email: dpo@aicoach.com  
Address: [Company Address]

**Supervisory Authority:**  
If you believe we haven't handled your data properly, contact:  
**ICO (UK):** https://ico.org.uk  
**EU Data Protection Authorities:** https://edpb.europa.eu

---

## Updates to This Policy

We will notify users of material changes via:
- Email notification
- In-app notification
- Updated "Last Updated" date

---

## Compliance Checklist

- [x] Privacy policy published
- [x] Terms of service updated
- [x] Cookie consent implemented
- [x] Data export functionality
- [x] Account deletion process
- [x] Data retention automation
- [x] DPA with vendors
- [x] Security measures documented
- [x] Breach response plan
- [x] Staff training program
- [x] Regular compliance audits

---

**Version:** 1.0  
**Effective Date:** May 10, 2026  
**Next Review:** November 10, 2026
