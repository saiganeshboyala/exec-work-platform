# Contributing

## Branches and commits

Branch from `develop`: `feature/short-description`, `fix/short-description`, or
`chore/short-description`. Release branches merge into `main`.

Commit messages follow Conventional Commits:

```
feat(items): add blocked reason to status changes
fix(auth): revoke the presented refresh token on rotation
docs(adr): record the modular monolith decision
```

Scope is the module name. This is what generates the changelog, so it matters.

## Pull requests

Keep them under roughly 400 changed lines. A pull request should describe what
changed, why, and how it was verified. Every pull request must:

- pass lint, typecheck, and tests
- include tests for new business logic
- include a migration when the schema changes, never an edited old migration
- update the docs when it changes a convention

## Definition of done

- [ ] Contract added or updated in `packages/contracts`
- [ ] Input validated at the route with `validate(schema)`
- [ ] Role checked with `authorize(role)`, ownership checked in the service
- [ ] Tenant scope applied in every query
- [ ] Audit row written through `activityService.record`
- [ ] Errors thrown as `AppError`, never as strings or bare `Error`
- [ ] Tests cover the happy path and the two most likely failures
