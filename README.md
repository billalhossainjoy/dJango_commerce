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
  and custom hostnames, Cloudflare R2, Stripe, and a background worker.

## Repository layout

```text
client/   Next.js storefront and administration UI
server/   Django API and business logic
docs/     Optional local documentation; the private plan is not committed
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

To test production configuration locally after creating `.env.production`:

```bash
DJANGO_ENVIRONMENT=production uv run --project server python server/manage.py check --deploy
```

This setup does not yet include a production image or deployment workflow.

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
