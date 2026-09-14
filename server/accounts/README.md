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
| `views/session.py` | Shared refresh-cookie and logout handling |
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

Run account tests from the repository root:

```bash
env -u DATABASE_URL DJANGO_ENVIRONMENT=test uv run --project server pytest server/accounts
```
