# Accounts app

This app handles platform owners and customers scoped to a tenant. API routes
are registered in `urls.py` (platform) and `customer_urls.py` (store customers).

| Location | Responsibility |
| --- | --- |
| `models.py`, `managers.py` | User identities, constraints, and the email outbox |
| `backends.py`, `permissions.py`, `throttles.py` | Authentication, access rules, and request limits |
| `selectors.py` | Active-store lookup and account queries scoped to a platform or tenant |
| `tokens.py` | JWT creation and refresh eligibility |
| `serializers/platform.py` | Owner signup and current-user responses |
| `serializers/customer.py` | Customer signup, profile, and password validation |
| `serializers/authentication.py` | Platform and tenant login validation |
| `serializers/email.py` | Verification and password-reset request validation |
| `views/platform.py`, `views/customer.py` | Account API endpoints |
| `views/session.py` | Shared login, refresh-cookie configuration, and logout handling |
| `email_urls.py` | Verification and password-reset routes shared by both account types |
| `views/email.py` | Verification and password-reset endpoints |
| `emails/actions.py` | Single-use account links and email composition |
| `emails/delivery.py` | Transactional outbox, delivery attempts, and retries |
| `emails/backend.py` | Resend HTTPS implementation of Django's email backend |
| `templates/accounts/` | HTML email templates |
| `management/commands/` | Operational commands such as `send_pending_emails` |
| `tests/` | API, account recovery, and email transport coverage |

The `views` and `serializers` packages export their public endpoint and serializer
classes. Shared session helpers live in `views.session`; JWT helpers live in
`tokens`. Other apps queue messages through `accounts.emails.delivery.queue_email`.
Production's Resend backend path is `accounts.emails.backend.ResendEmailBackend`.

## Review and simplification

| Files reviewed | Result |
| --- | --- |
| `models.py`, migrations | Kept the identity constraints, verification fields, and outbox schema intact. |
| `managers.py` | Removed an override that only called Django's existing email normalization. |
| `backends.py`, `serializers/authentication.py` | Reused Django's password-hashing helper. Platform login now performs hashing for unknown and inactive accounts, too. Kept tenant-owner matching and ambiguous-login rejection. |
| `permissions.py` | Reused the platform-user permission when checking platform administrators. |
| `throttles.py` | Kept the separate tenant and email rate limits. |
| `tokens.py` | Keeps tenant claims, signup verification requirements, and password-change revocation. Existing accounts remain accessible unless verification was explicitly required. |
| `selectors.py` | Kept tenant availability and account-scope checks. |
| `serializers/platform.py`, `serializers/customer.py` | Used field validators for signup passwords and reused the owner-tenant response serializer. Kept signup transactions and email-change verification. |
| `serializers/email.py`, `views/email.py` | Kept single-use token validation and generic recovery responses. Combined link-user lookup and row locking into one database query. |
| `views/platform.py`, `views/customer.py`, `views/session.py` | Centralized cookie settings and login response handling. Login, refresh, and logout use the same cookie scope. |
| `urls.py`, `customer_urls.py`, `email_urls.py` | Defined email routes once while preserving their existing paths and names. |
| `emails/actions.py` | Kept account-specific links, expiry, and resend cooldowns. |
| `emails/delivery.py`, retry command | Kept transactional delivery, retry backoff, deduplication, and removal of sent message bodies. |
| `emails/backend.py`, email template | Kept provider idempotency, header validation, HTML escaping, and delivery error handling. |
| `admin.py`, app configuration, package exports | Kept admin fields and public imports stable. |
| `tests/` | Added regression coverage for failed-login hashing and signup password validation; extended cookie coverage through refresh and logout. |

Run account tests from the repository root:

```bash
env -u DATABASE_URL DJANGO_ENVIRONMENT=test uv run --project server pytest server/accounts
```
