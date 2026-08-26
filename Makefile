.PHONY: help setup dev up down logs migrate seed test lint build clean

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup:   ## Install dependencies and prepare local env files
	npm ci
	cp -n apps/api/.env.example apps/api/.env || true
	cp -n apps/web/.env.example apps/web/.env || true

up:      ## Start Postgres, Redis and Mailpit
	docker compose up -d postgres redis mailpit

down:    ## Stop all containers
	docker compose down

logs:    ## Tail container logs
	docker compose logs -f

migrate: ## Apply database migrations
	npm run db:migrate

seed:    ## Load demo data
	npm run db:seed

dev:     ## Run api and web in watch mode
	npm run dev

test:    ## Run all test suites
	npm run test

lint:    ## Lint and typecheck everything
	npm run lint && npm run typecheck

build:   ## Production build
	npm run build

clean:   ## Remove build output and dependencies
	rm -rf node_modules apps/*/node_modules packages/*/node_modules apps/*/dist packages/*/dist
