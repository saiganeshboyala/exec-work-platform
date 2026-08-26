# Onboarding

## Your first hour

```bash
git clone <repo> && cd exec-work-platform
make setup && make up && make migrate && make seed && make dev
```

Open http://localhost:5173 and sign in as `ceo@northwind.test` /
`DemoPassword123`. Open http://localhost:8025 to see outgoing mail.

Then read, in order:

1. `docs/01-architecture.md` — the shape and the five rules
2. `docs/02-folder-structure.md` — where things live and why
3. `docs/03-coding-standards.md` — how we write

## Your first change: trace one request

Follow `GET /api/v1/dashboard/executive` end to end. It touches every layer:

```
apps/web/src/features/dashboard/pages/DashboardPage.tsx
  └─ hooks/useExecutiveDashboard.ts
     └─ api/dashboard.api.ts
        └─ shared/api/http-client.ts        ← the only fetch call
           ▼ HTTP
apps/api/src/routes/v1.ts
  └─ modules/dashboard/dashboard.routes.ts   authenticate → authorize → validate
     └─ dashboard.controller.ts
        └─ dashboard.service.ts              the rollup logic
           └─ dashboard.repository.ts        the only Prisma call
```

Once you can narrate that, you can add a feature.

## Adding a feature: the checklist

**API**

1. Contract in `packages/contracts` — schema and DTO
2. Prisma model and a migration, if the schema changes
3. `modules/<name>/` with the five standard files
4. Mount it in `routes/v1.ts`
5. Audit record via `activityService.record`
6. Tests

**Web**

1. `features/<name>/api/` — endpoint functions
2. `features/<name>/hooks/` — query and mutation hooks
3. `features/<name>/components/` and `pages/`
4. Export pages from `features/<name>/index.ts`
5. Route in `app/router.tsx`

## Where people get stuck

- **"Prisma client not found"** — run `npm run build --workspace=@ewp/contracts`
  then `npx prisma generate` in `apps/api`.
- **Import blocked by lint** — you are reaching into another module's internals.
  Import from its `index.ts` instead.
- **A query returns another tenant's data in a test** — you forgot the
  `organizationId` filter. Every repository lookup joins back to `organization`.
- **Emails not arriving** — in development they go to Mailpit, not to a real
  inbox.
