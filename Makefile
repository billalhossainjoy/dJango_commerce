SHELL := /bin/bash

.DEFAULT_GOAL := help

.PHONY: help dev client server server-test test

help:
	@echo "Available commands:"
	@echo "  make dev          Run the client and server together"
	@echo "  make client       Run the Next.js development client"
	@echo "  make server       Run the Django development server"
	@echo "  make server-test  Run all Django server tests"

dev:
	@set -e; \
	$(MAKE) server & server_pid=$$!; \
	$(MAKE) client & client_pid=$$!; \
	trap 'kill $$server_pid $$client_pid 2>/dev/null || true' EXIT INT TERM; \
	wait -n $$server_pid $$client_pid

client:
	pnpm --dir client dev --hostname 0.0.0.0

server:
	uv run --project server python server/manage.py runserver 0.0.0.0:8000

server-test:
	env -u DATABASE_URL DJANGO_ENVIRONMENT=test uv run --project server pytest server

test: server-test
