# API conventions

Base path: `/api/v1`. The version is in the path, so a breaking change ships as
`/api/v2` beside the old one rather than breaking live clients.

## Envelope

Success:

```json
{ "success": true, "data": { }, "meta": { }, "requestId": "..." }
```

Failure:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_FAILED", "message": "Check the highlighted fields",
             "details": [{ "field": "password", "message": "Use at least 12 characters" }] },
  "requestId": "..."
}
```

`requestId` appears on every response and in the `x-request-id` header, and is
written to the audit trail. One identifier ties a support ticket to a log line to
a database row.

## Status codes

| Code | Used for |
| --- | --- |
| 200 | Read or update succeeded |
| 201 | Created |
| 204 | Deleted, nothing to return |
| 400 | Validation failed — always with `details` |
| 401 | No session, or the session expired |
| 403 | Signed in, but the role does not allow it |
| 404 | Not found, or not visible to this tenant |
| 409 | Conflict — duplicate, or a rule like "keep one owner" |
| 410 | Invitation expired or revoked |
| 429 | Rate limited |
| 500 | Bug. Details are logged, never returned |

A record belonging to another tenant returns **404, not 403** — 403 would confirm
it exists.

## Endpoints

```
POST   /auth/register              create an organization and its first owner
POST   /auth/login
POST   /auth/refresh               rotates: the presented token is revoked
POST   /auth/logout
GET    /auth/me

GET    /members                    list members
POST   /members/invitations        invite by email
DELETE /members/invitations/:id    revoke
POST   /members/invitations/accept public - the token is the credential
PATCH  /members/:userId/role
DELETE /members/:userId

GET    /workspaces                 CRUD, tenant scoped
GET    /boards?workspaceId=
GET    /items?boardId=&status=&health=&ownerId=&search=&page=&pageSize=&sort=
POST   /meetings                   auto-builds the agenda from blocked work
POST   /meetings/:id/decisions     records a decision, optionally as an item

GET    /dashboard/executive        the Todo rollup
GET    /activity                   audit trail, manager and above

GET    /health/live                liveness, for the container
GET    /health/ready               readiness, for the load balancer
```

## Pagination, filtering, sorting

`?page=1&pageSize=25&sort=dueDate:desc`. `pageSize` caps at 100. Sort fields are
allow-listed per endpoint — user input never reaches `orderBy` directly.

## Adding an endpoint

1. Add the schema and DTO to `packages/contracts`.
2. Add the repository query, then the service rule, then the controller.
3. Register the route with `validate(schema)` and `authorize(role)`.
4. Write the audit record inside the same transaction as the change.
5. Add the endpoint function to the matching feature's `api/` folder on the web.
