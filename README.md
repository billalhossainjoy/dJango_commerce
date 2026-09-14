# Multi-tenant e-commerce platform

This repository is the foundation for a hosted, multi-tenant e-commerce
application. Django provides the authoritative API and business rules, while
Next.js provides tenant storefronts, tenant administration, and platform
administration from one shared deployment.

The project is currently at the foundation stage. The initial tenant and custom
user models exist, while hostname resolution, catalog, billing, domain, and
order features have not been implemented yet.

## Architecture direction

- Django REST API and Next.js are separate applications in this monorepo.
- Tenant data will share PostgreSQL and be isolated by a required tenant ID.
- The request hostname will identify the tenant.
- Browser API traffic will use a same-origin `/api` route through Next.js. The
  Django service will not trust a tenant ID supplied directly by a browser.
- Production services will run on Railway with Neon PostgreSQL, Cloudflare DNS
  and custom hostnames, Cloudinary for product images, Stripe, and a background
  worker.

## Repository layout

```text
client/   Next.js storefront and administration UI
server/   Django API and business logic
```

## Development environment

The repository uses a VS Code devcontainer for Python, Node.js, pnpm, and uv.
PostgreSQL runs as a separate Docker Compose service with persistent local data.
The container keeps its Python virtual environment outside the bind-mounted
repository, so it does not overwrite a host-specific `server/.venv`.

The committed VS Code configuration provides Python and Django completion,
import discovery, formatting, linting, tests, debugging, and balanced static
type checking for Django and Django REST Framework. In the devcontainer the
Python interpreter is selected automatically. For local editing, run
`uv sync --project server --locked`, then select `server/.venv/bin/python` (or
`server\\.venv\\Scripts\\python.exe` on Windows) with **Python: Select
Interpreter** once.

## Start development

1. Open this repository in VS Code.
2. Run **Dev Containers: Reopen in Container**.
3. Wait for the post-create dependency installation to finish.
4. Start the backend in one terminal:

   ```bash
   uv run --project server python server/manage.py migrate
   uv run --project server python server/manage.py runserver 0.0.0.0:8000
   ```

5. Start the frontend in another terminal:

   ```bash
   pnpm --dir client dev --hostname 0.0.0.0
   ```

The frontend is available at <http://localhost:3000>, Django at
<http://localhost:8000>, and PostgreSQL on `localhost:5432` from the host. From
inside the devcontainer, connect to PostgreSQL at `postgres:5432`.

Once hostname-based tenancy is implemented, use addresses such as
`http://demo.localhost:3000`. The special `.localhost` domain resolves to the
local machine and lets development exercise the same hostname flow as
production.

## Verify the baseline

The MVP uses risk-based testing to keep delivery fast. Run lint, formatting,
configuration, migration, and frontend build checks continuously. Add automated
tests during MVP only for release-blocking risks such as tenant isolation,
authorization boundaries, authoritative order totals, and payment/webhook
idempotency. Broader regression coverage is a post-demo hardening task.

Run these commands before merging foundation changes:

```bash
uv run --project server ruff check server
uv run --project server ruff format --check server
env -u DATABASE_URL DJANGO_ENVIRONMENT=test uv run --project server mypy --config-file server/pyproject.toml server
uv run --project server python server/manage.py check
uv run --project server python server/manage.py makemigrations --check --dry-run
env -u DATABASE_URL DJANGO_ENVIRONMENT=test uv run --project server pytest server
pnpm --dir client lint
pnpm --dir client build
```

## Environment files

- `.env.development` contains non-sensitive local Docker values.
- `.env.production.example` is the production configuration contract.
- `.env.production` is ignored and must contain the real Django and Neon
  credentials when you configure production.

Product images use a signed Cloudinary upload preset. Configure that preset to
allow only `jpg`, `png`, and `webp` images and set its maximum file size to
5,242,880 bytes (5 MiB). Keep the Cloudinary API secret on the Django service;
never expose it through a `NEXT_PUBLIC_` variable.

To test production configuration locally after creating `.env.production`:

```bash
DJANGO_ENVIRONMENT=production uv run --project server python server/manage.py check --deploy
```

## Railway deployment

The Django service uses `/server` as its root directory, Railpack with Python
3.14 (pinned in `server/.python-version`), and these service settings:

- Pre-deploy command: `python manage.py migrate --noinput`
- Start command: `sh start.sh`
- Healthcheck: `/api/v1/readiness/` with a 120-second timeout
- Port: `8080`

Import production secrets into Railway variables, including
`DJANGO_ENVIRONMENT=production`. Include the API hostname and
`healthcheck.railway.app` in `ALLOWED_HOSTS`. The startup script collects static
files and starts Gunicorn; WhiteNoise serves Django's static assets.

The Next.js service uses `/client` as its root directory. Set `DJANGO_API_URL`
to the HTTPS backend origin and `NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN` to the public
platform domain. Rebuild the client after changing either variable because
Next.js embeds the API rewrite and public configuration during its build.

For the trial plan's single custom domain, use `*.stockfare.app` on the client
service. Keep `NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN=stockfare.app` for tenant URLs,
set `NEXT_PUBLIC_PLATFORM_HOSTNAME=www.stockfare.app` for platform redirects,
and set the server's `PLATFORM_FRONTEND_ORIGIN=https://www.stockfare.app`.
In Cloudflare, configure the wildcard CNAME and the DNS-only `_acme-challenge`
CNAME supplied by Railway. Keep Railway's ownership verification TXT record.
The apex `stockfare.app` requires a Cloudflare redirect to `www.stockfare.app`;
the wildcard does not cover the apex. Preserve the request path and query string
and keep the apex DNS record proxied so Cloudflare can perform that redirect.

Deploy local server changes with `railway up --service dJango_commerce` from the
repository root. Verify both `/api/v1/health/` and `/api/v1/readiness/` through
the public frontend after deployment. Keep the deployment files in the GitHub
branch used by Railway before relying on subsequent GitHub autodeploys.

## Commit messages

The repository uses [Conventional Commits](https://www.conventionalcommits.org/)
with an optional scope:

```text
type(optional-scope): short description
```

Examples:

```text
feat(api): add product filtering
fix: prevent duplicate orders
docs: explain local database setup
```

The supported types are `build`, `bump`, `chore`, `ci`, `docs`, `feat`, `fix`,
`perf`, `refactor`, `revert`, `style`, and `test`. Keep the first line at 72
characters or fewer. Git-generated merge and revert messages are accepted.

The devcontainer installs the `commit-msg` hook automatically. Outside the
devcontainer, install the dependencies and hook from the repository root:

```bash
uv sync --project server --locked
uv run --project server pre-commit install --hook-type commit-msg
```

To compose a commit interactively:

```bash
uv run --project server cz commit
```

Manual `git commit` messages are also accepted when they follow the convention;
the hook rejects malformed messages. GitHub Actions validates every new commit
again in CI.
