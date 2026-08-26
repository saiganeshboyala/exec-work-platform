# Deployment

## Environments

| Environment | Branch | Purpose |
| --- | --- | --- |
| Local | any | Development, with Mailpit standing in for email |
| Staging | `develop` | Integration testing against seeded data |
| Production | `main` | Live |

## Images

Both Dockerfiles are multi-stage and build from the repository root so the
workspace packages resolve. Both run as a non-root user and carry a healthcheck.

```bash
docker build -f apps/api/Dockerfile -t ewp-api:$(git rev-parse --short HEAD) .
docker build -f apps/web/Dockerfile -t ewp-web:$(git rev-parse --short HEAD) .
```

## Release sequence

1. Run migrations first: `npm run db:migrate`. Migrations must be backwards
   compatible with the currently deployed code — add columns nullable, backfill,
   then make them required in a later release.
2. Roll out the API. Wait for `/api/v1/health/ready` to return 200.
3. Roll out the web bundle.
4. Watch the 5xx rate and the job failure rate for one release cycle.

Rolling back means deploying the previous image. It does **not** mean reversing a
migration — which is why migrations stay backwards compatible.

## Configuration

Everything comes from environment variables, validated at boot by
`src/config/env.ts`. A missing or malformed variable exits the process before it
serves a request. Secrets come from your platform's secret manager, never from a
committed file.

## Scaling

- The API is stateless; scale it horizontally behind a load balancer.
- Run the worker as a separate replica set of the same image when email volume
  grows, and remove `startEmailWorker()` from the API boot path at that point.
- The first database bottleneck will be the dashboard aggregate. Move
  `dashboard.repository` behind a materialized view refreshed by a scheduled job.
- Add read replicas before sharding. You will not need sharding.

## Observability

- Logs are structured JSON in production, one line per request, with `requestId`.
- `/health/live` for the container, `/health/ready` for the load balancer.
- Alert on: 5xx rate, p95 latency, job failure rate, queue depth, database
  connection saturation.
