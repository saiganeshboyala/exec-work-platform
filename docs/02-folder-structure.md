# Folder structure

The organising principle is **one folder per thing, never a folder per file
type**. You should be able to delete a feature by deleting one directory.

## Repository

```
exec-work-platform/
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   ├── contracts/          shared zod schemas + DTOs
│   ├── eslint-config/
│   └── tsconfig/
├── infra/                  database bootstrap, ops files
├── docs/                   this documentation
└── .github/workflows/      CI
```

## API

```
apps/api/src/
├── config/                 env parsing. The only place process.env is read
├── common/                 cross-cutting, owned by no module
│   ├── errors/             AppError and the error code registry
│   ├── http/               response envelope, asyncHandler
│   ├── middleware/         auth, validation, rate limit, error handler
│   ├── logger/
│   ├── types/              express request augmentation
│   └── utils/              pagination, health derivation
├── database/               Prisma client and lifecycle
├── integrations/           external providers behind interfaces
│   ├── email/              console | smtp
│   └── calendar/           none | google | microsoft
├── jobs/                   queues and workers
├── modules/                the business. One folder per domain
│   ├── auth/
│   ├── users/
│   ├── members/
│   ├── workspaces/
│   ├── boards/
│   ├── items/
│   ├── meetings/
│   ├── activity/
│   ├── dashboard/
│   └── health/
├── routes/                 the v1 mounting table
├── app.ts                  express assembly, no side effects
└── main.ts                 boot, listen, graceful shutdown
```

Every module has the same file names, so a developer who has read one module can
navigate all of them:

```
modules/items/
├── items.routes.ts         paths and middleware
├── items.controller.ts     request in, response out
├── items.service.ts        business rules
├── items.repository.ts     Prisma queries
├── items.mapper.ts         row → DTO
└── index.ts                the module's public surface
```

## Web

```
apps/web/src/
├── app/                    providers, router, shell. Assembly only
│   ├── App.tsx
│   ├── router.tsx
│   ├── providers.tsx
│   ├── RequireAuth.tsx
│   └── layout/AppShell.tsx
├── features/               one folder per user-facing capability
│   ├── auth/
│   ├── dashboard/
│   ├── boards/
│   └── members/
└── shared/                 used by two or more features
    ├── api/                http client, query keys
    ├── components/         presentational primitives
    ├── config/
    ├── lib/                formatting helpers
    └── styles/             tokens.css, global.css
```

A feature folder looks the same every time:

```
features/dashboard/
├── api/                    endpoint functions for this feature
├── hooks/                  query and mutation hooks
├── components/             pieces used only by this feature
├── pages/                  route-level screens
└── index.ts                what other features may import
```

**A feature never imports from another feature's internals.** If two features
need the same thing, it moves to `shared/`. That single rule is what stops the
folder tree turning back into a pile.
