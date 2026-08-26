# Security and access control

## Roles

Roles are ranked. A check for `MANAGER` admits `MANAGER`, `ADMIN`, and `OWNER`.

| Role | Rank | Can do |
| --- | --- | --- |
| `OWNER` | 60 | Everything, including billing and transferring ownership |
| `ADMIN` | 50 | Manage people and roles, delete workspaces |
| `MANAGER` | 40 | Create workspaces, invite people, read the audit trail |
| `MEMBER` | 30 | Create and edit boards and items |
| `GUEST` | 20 | Read and edit only the boards they are added to |
| `VIEWER` | 10 | Read only — the default for executives who consume, not edit |

Role lives on `Membership`, never on `User`. One person can hold different roles
in different organizations.

## The three checks

Every protected endpoint applies all three, in this order:

1. **Authentication** — `authenticate` verifies the bearer token and attaches
   `req.auth`.
2. **Role** — `authorize('MANAGER')` compares rank. This is coarse and lives in
   middleware.
3. **Resource ownership** — the service loads the record scoped to
   `organizationId` and throws 404 if it is missing. This is fine-grained and
   lives in the service, because only the service knows the relation path.

Skipping the third check is the most common way a multi-tenant system leaks. It
is why every repository lookup joins back to `organization`.

## Tokens

- **Access token** — JWT, 15 minutes, held in memory in the browser. Never in
  `localStorage`.
- **Refresh token** — 48 random bytes, 30 days, stored as a SHA-256 hash. It is
  revocable, and it rotates on every use: the presented token is revoked as the
  new one is issued. A replayed token therefore fails.
- **Invitation token** — 32 random bytes, hashed the same way, expires in 14 days,
  single use.

Passwords use Argon2id at the OWASP-recommended parameters. Login always runs a
verification even when the account does not exist, so response timing does not
reveal which addresses are registered.

## Other controls in place

- Helmet security headers, CORS locked to `WEB_BASE_URL`.
- 300 requests per minute globally; 10 per 15 minutes on credential endpoints.
- Every input parsed by zod at the route boundary. Parsed values replace the raw
  ones, so a handler cannot accidentally use unvalidated input.
- Prisma parameterises everything; there is no raw SQL on a user path.
- Secrets redacted from logs centrally.
- Body size capped at 1 MB.

## Audit trail

`Activity` is append-only. There is no update or delete method on the repository,
by design. Every state change records actor, entity, verb, before, after, and
request id, inside the same transaction as the change itself — so an audit row
cannot go missing when a write succeeds.

## Before going live

- [ ] Regenerate every secret; the `.env.example` values are placeholders
- [ ] `EMAIL_DRIVER=smtp` — the console driver refuses to start in production
- [ ] TLS terminated at the load balancer, HSTS enabled
- [ ] Database backups with a tested restore, not just a backup job
- [ ] Log aggregation and alerting on 5xx rate and job failure rate
- [ ] Dependency scanning in CI (`npm audit`, Dependabot, or equivalent)
