# E-commerce development environment

The repository uses a VS Code devcontainer for Python, Node.js, pnpm, and uv.
PostgreSQL runs as a separate Docker Compose service with persistent local data.
The container keeps its Python virtual environment outside the bind-mounted
repository, so it does not overwrite a host-specific `server/.venv`.

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
