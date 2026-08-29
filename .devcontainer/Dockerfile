FROM mcr.microsoft.com/devcontainers/python:2-3.14-trixie

COPY --from=ghcr.io/astral-sh/uv:0.12.7 /uv /uvx /usr/local/bin/

# The Python devcontainer image currently ships a Yarn APT source without its
# signing key. Node and pnpm are provided by the devcontainer feature, so the
# Yarn source is not needed and would make `apt-get update` fail on rebuild.
RUN rm -f /etc/apt/sources.list.d/yarn.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && curl -fsSL https://artifacts-cli.infisical.com/setup.deb.sh | bash \
    && apt-get install -y --no-install-recommends infisical \
    && curl -fsSL https://railway.com/install.sh \
        | RAILWAY_VERSION=5.30.1 bash -s -- --yes --bin-dir /usr/local/bin \
    && rm -rf /var/lib/apt/lists/*
