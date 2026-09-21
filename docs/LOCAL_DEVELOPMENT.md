# Local development

BookFlow's local stack is reproducible with Docker Compose and the sanitized
development defaults in the root `.env.example`. The API and worker load a
package-local `.env`, then the root `.env`; in non-production environments,
missing values fall back to the corresponding `.env.example`. Production never
uses example-file fallback and must receive every required secret explicitly.

## Prerequisites

- Node.js 24.15.0
- pnpm 10.15.0 through Corepack
- Docker Desktop with Docker Compose v2

## Quick start

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`db:migrate` and `db:seed` remain safe connectivity placeholders until Prisma
and the canonical schema arrive in Phase 3. They are already part of the stable
root command surface.

For an explicit infrastructure readiness wait, use `pnpm infra:up`. Shut down
containers with `pnpm infra:down`; named volumes are retained so local data is
not destroyed.

## Local services

| Service | Endpoint | Purpose |
| --- | --- | --- |
| PostgreSQL | `localhost:5432` | Primary relational database |
| Redis | `localhost:6379` | Queue and cache transport |
| MinIO S3 API | `http://localhost:9000` | Object storage |
| MinIO console | `http://localhost:9001` | Object storage administration |
| Mailpit SMTP | `localhost:1025` | Local outbound mail capture |
| Mailpit UI | `http://localhost:8025` | Inspect captured messages |
| API | `http://localhost:4000/api/v1` | Versioned application API |
| Swagger | `http://localhost:4000/api/docs` | Development API documentation |

The API exposes unversioned operational probes at `/health/live` and
`/health/ready`; application endpoints use the `/api/v1` prefix. Readiness
checks PostgreSQL, Redis, and the configured S3 bucket. MinIO's one-shot
initializer creates the private `bookflow-local` bucket idempotently.

## Environment boundaries

- API and worker configuration is server-only. Database, JWT, Redis, and object
  storage credentials must never use a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefix.
- Web applications may expose only `NEXT_PUBLIC_*` values.
- Mobile may expose only `EXPO_PUBLIC_*` values; Expo embeds these values into
  the application bundle.
- Root and package `.env.example` files are documentation and local defaults,
  not production credentials. Real `.env` files remain gitignored.

## Verification

```bash
pnpm infra:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
```

Integration tests require the Compose stack. They verify PostgreSQL and Redis
connectivity plus an actual MinIO put/get/delete cycle.
