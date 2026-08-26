# CIS Technologies

A work management platform for leadership teams. Teams run their work on boards;
executives read the same data on Todo — health, exceptions, a
decision queue, and the meetings where those decisions get taken.

Multi-tenant by default: every row is scoped to an `Organization`, and every
query filters on it.

## What is here

| Path | What it holds |
| --- | --- |
| `apps/api` | REST API — Express, Prisma, PostgreSQL, BullMQ |
| `apps/web` | Web client — React, Vite, TanStack Query |
| `packages/contracts` | Zod schemas and DTOs shared by both. One source of truth |
| `packages/tsconfig` | Base TypeScript configs |
| `packages/eslint-config` | Shared lint rules, including the architecture guards |
| `infra` | Database bootstrap and other infrastructure files |
| `docs` | Architecture, standards, security, deployment, onboarding |

## Run it locally

```bash
make setup     # install dependencies, create .env files
make up        # start postgres, redis, mailpit
make migrate   # apply the schema
make seed      # load demo data
make dev       # api on :4000, web on :5173
```

Sign in with `ceo@northwind.test` / `DemoPassword123`.
Outgoing mail is captured by Mailpit at http://localhost:8025.

Run `make help` for the full task list.

## Before you write code

Read [`docs/03-coding-standards.md`](docs/03-coding-standards.md) and
[`docs/02-folder-structure.md`](docs/02-folder-structure.md). They are short, and
they are what keeps this codebase legible as the team grows.

## Quality gates

`npm run lint`, `npm run typecheck`, and `npm run test` all run in CI on every
pull request, along with a production build of both Docker images. A pull
request that fails any of them does not merge.
