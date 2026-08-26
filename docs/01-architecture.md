# Architecture

## Shape

A modular monolith. One deployable API process, one static web bundle, and a
worker that shares the API image. Modules are strictly separated inside the
process, so any of them can be lifted out into its own service later without a
rewrite — but nothing is split until traffic actually demands it.

```
Browser ──▶ Web (nginx, static)
              │
              ▼
        API (Express)
        ├── modules/       business logic, one folder per domain
        ├── jobs/          BullMQ queues and workers
        └── integrations/  email, calendar — behind interfaces
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
  Postgres  Redis   Provider APIs
```

## Layers inside a module

```
routes       HTTP surface: path, middleware chain, nothing else
controller   Reads the request, calls the service, sends the response
service      Business rules, authorization on resources, transactions
repository   Database access. The only layer that touches Prisma
mapper       Row → DTO. Keeps the wire format out of the business logic
```

A layer may call the layer directly below it and no further. A controller never
touches Prisma. A repository never throws `AppError`.

## Rules that hold the structure together

1. **Modules talk through their `index.ts`.** Importing
   `@/modules/items/items.repository` from another module is a lint error. Import
   `@/modules/items` instead.
2. **Contracts are shared, models are not.** The web client imports from
   `@ewp/contracts`. It never sees a Prisma type.
3. **Tenant scope is not optional.** Every query filters on `organizationId`,
   directly or through a relation. There is no "admin bypass" query helper.
4. **Derived values are derived.** Health is computed from status and due date
   at read time. Storing it would guarantee it goes stale.
5. **Slow work goes on the queue.** Email, calendar sync, and report rebuilds
   never run inside a request.

## Read and write paths

Writes go through services and are audited. Reads for Todo go through
`dashboard.repository`, which is deliberately separate — those are aggregate
scans, and they are the first thing to move behind a materialized view when the
item table gets large. That split exists now so the migration is a one-file
change later.
