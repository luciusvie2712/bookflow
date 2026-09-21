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

`db:migrate` applies committed Prisma migrations without rewriting migration
history. `db:seed` generates Prisma Client and idempotently installs the
canonical permission registry plus local demo data.

## Database workflow

```bash
# Validate and generate the Prisma Client
pnpm --filter @bookflow/api db:validate
pnpm db:generate

# Create a new local migration after editing schema.prisma
pnpm db:migrate:dev -- --name add_booking_indexes

# Rebuild a disposable local database from migrations + seed
pnpm db:reset
```

Migration names use `<YYYYMMDDHHMMSS>_<snake_case_description>`. Never edit a
migration already applied to a shared, staging, or production database. The
reset command destroys the configured database and must only target disposable
local development data.

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
connectivity plus an actual MinIO put/get/delete cycle. The Phase 3 database
suite also creates an isolated temporary PostgreSQL database, applies every
committed migration, runs the development seed, verifies foreign keys, unique
and check constraints, and drops the temporary database afterward.
