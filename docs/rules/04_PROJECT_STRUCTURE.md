# BookFlow — Project Structure & Dependency Rules

**Status:** Canonical Rules/Context Document  
**Source:** `BookFlow_Project_Overview.md` v1.0 — 17/09/2026  
**Architecture:** Turborepo monorepo + NestJS modular monolith + Next.js web apps + Expo mobile.

## 1. Canonical monorepo tree

```text
bookflow/
├── apps/
│   ├── api/                       # NestJS REST API + Socket.IO gateway
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── businesses/
│   │       ├── memberships/
│   │       ├── roles/
│   │       ├── branches/
│   │       ├── services/
│   │       ├── staff/
│   │       ├── schedules/
│   │       ├── availability/
│   │       ├── bookings/
│   │       ├── queues/
│   │       ├── customers/
│   │       ├── payments/
│   │       ├── vouchers/
│   │       ├── reviews/
│   │       ├── notifications/
│   │       ├── subscriptions/
│   │       ├── analytics/
│   │       ├── files/
│   │       ├── audit/
│   │       ├── realtime/
│   │       ├── jobs/
│   │       └── common/
│   │
│   ├── worker/                    # BullMQ worker; may share API process in free demo deployment
│   │   └── src/
│   │
│   ├── customer-web/              # Next.js public/customer web
│   │   └── src/
│   │       ├── app/
│   │       ├── features/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── lib/
│   │
│   ├── business-web/              # Next.js tenant dashboard
│   │   └── src/
│   │       ├── app/
│   │       ├── features/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── lib/
│   │
│   ├── admin-web/                 # Next.js platform admin
│   │   └── src/
│   │       ├── app/
│   │       ├── features/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── lib/
│   │
│   └── mobile/                    # React Native + Expo Router
│       ├── app/
│       └── src/
│           ├── features/
│           ├── components/
│           ├── hooks/
│           └── lib/
│
├── packages/
│   ├── api-client/                # typed HTTP client used by web/mobile
│   ├── types/                     # transport-safe shared TS types only
│   ├── validation/                # shared runtime schemas safe for client/server
│   ├── domain-contracts/          # public domain/event contracts, no server implementation
│   ├── ui/                        # reusable web UI components when framework-compatible
│   ├── eslint-config/
│   └── tsconfig/
│
├── infrastructure/
│   ├── docker/
│   └── scripts/
│
├── docs/
│   └── rules/
│       ├── 01_DATABASE_SCHEMA.md
│       ├── 02_CODING_CONVENTIONS.md
│       ├── 03_API_SPECIFICATION.md
│       ├── 04_PROJECT_STRUCTURE.md
│       ├── 05_STATE_MACHINES_AND_BUSINESS_RULES.md
│       ├── 06_ROLES_AND_PERMISSIONS.md
│       └── 07_ENV_AND_CONFIG.md
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## 2. Workspace responsibilities

### `apps/api`

Owns:

- authentication/session logic
- tenant membership/RBAC enforcement
- REST API
- WebSocket gateway
- Prisma/database access
- booking/availability/queue/payment domain logic
- transaction boundaries
- signed QR validation
- provider adapters
- OpenAPI docs

Must not import UI code from any web/mobile app.

### `apps/worker`

Owns:

- BullMQ processors
- notification delivery
- reminders
- hold expiry
- payment reconciliation jobs
- analytics aggregation
- cleanup jobs

Worker may reuse server-safe application/domain packages only if those packages do not pull in request-specific NestJS transport state.

### `apps/customer-web`

Owns:

- public discovery/SEO
- business/service detail
- browser booking flow
- booking detail/QR
- customer account/profile

Must use `packages/api-client` for BookFlow API calls.

### `apps/business-web`

Owns:

- dashboard
- calendar
- bookings
- queue
- customers
- services
- staff
- branches
- promotions
- reviews
- payments
- analytics
- team/roles
- settings

Must not contain authoritative booking/pricing/permission logic.

### `apps/admin-web`

Owns platform-level UI only:

- businesses/users/subscriptions
- platform transactions/reports
- feature flags
- audit/support views

Platform admin authorization remains server-side.

### `apps/mobile`

Owns:

- customer auth/discovery/booking
- push notifications
- QR/camera capability
- geolocation
- realtime queue
- SecureStore token persistence
- deep links

Must not import web-only or backend-only libraries.

## 3. Shared package responsibilities

### `packages/api-client`

May contain:

- HTTP transport wrapper
- endpoint functions
- typed error parsing
- auth header/cookie-compatible behavior
- idempotency/request-id headers
- request/response DTO transport types

Must not contain:

- React components
- Prisma
- NestJS providers
- database logic
- server secrets

### `packages/types`

Only transport-safe/shared TypeScript structures:

- API DTO response types
- simple enums/constants safe on all clients
- pagination types

Do not put executable server behavior here.

### `packages/validation`

Only runtime schemas that are truly useful on multiple surfaces, such as:

- email/phone normalization schemas
- public booking request schemas
- shared form/API payload validation

Do not expose server-only authorization or database validation.

### `packages/domain-contracts`

Owns stable cross-process contracts:

- domain event names/payloads
- WebSocket event envelopes
- provider-neutral interfaces if genuinely shared

It must not import Prisma models or NestJS request context.

### `packages/ui`

Reusable web-compatible presentation components only.

Do not force React Native to consume a DOM-oriented UI package. Mobile can share tokens/types where appropriate but should use native components.

## 4. Dependency direction

Allowed high-level graph:

```text
apps/customer-web ─┐
apps/business-web ─┼──> packages/api-client ──> packages/types
apps/admin-web ─────┤                         └─> packages/validation
apps/mobile ────────┘

apps/api ─────────────> packages/types
       └──────────────> packages/validation
       └──────────────> packages/domain-contracts

apps/worker ──────────> packages/domain-contracts
            └────────> server-safe shared code only
```

## 5. Forbidden imports

The following are architectural violations:

```text
apps/mobile        -> apps/api/**
apps/customer-web  -> apps/api/**
apps/business-web  -> apps/api/**
apps/admin-web     -> apps/api/**
packages/*         -> apps/*
packages/ui        -> packages/api-client application-specific hooks
client apps        -> @prisma/client
client apps        -> @nestjs/*
client apps        -> server env/secrets
apps/api           -> next/*, expo/*, react-native/*
```

Never share server implementation by importing backend files into a client. Share contracts, not infrastructure.

## 6. NestJS module internal structure

Use a consistent feature layout:

```text
apps/api/src/bookings/
├── bookings.module.ts
├── bookings.controller.ts
├── application/
│   ├── create-booking.service.ts
│   ├── reschedule-booking.service.ts
│   ├── cancel-booking.service.ts
│   └── queries/
├── domain/
│   ├── booking-state-machine.ts
│   ├── booking-policy.ts
│   └── errors/
├── infrastructure/
│   ├── booking.repository.ts
│   └── prisma-booking.repository.ts
├── dto/
│   ├── create-booking.dto.ts
│   ├── reschedule-booking.dto.ts
│   └── booking-response.dto.ts
└── tests/
    ├── booking-state-machine.spec.ts
    └── create-booking.integration-spec.ts
```

Not every simple module needs every subfolder. Preserve the dependency direction, avoid ceremony for its own sake.

## 7. Frontend feature structure

Recommended feature-oriented layout:

```text
src/features/bookings/
├── api/
│   ├── booking-queries.ts
│   └── booking-mutations.ts
├── components/
├── hooks/
├── schemas/
├── utils/
└── types.ts
```

Rules:

- page/route files compose features; they do not own complex domain logic.
- server state lives in TanStack Query.
- app-global UI state only goes to Zustand when justified.
- API calls go through `packages/api-client`.

## 8. Prisma location

Canonical path:

```text
apps/api/prisma/schema.prisma
```

Migrations:

```text
apps/api/prisma/migrations/<timestamp>_<description>/migration.sql
```

Seed:

```text
apps/api/prisma/seed.ts
```

Only backend/server tooling may import Prisma Client.

## 9. API client organization

Recommended:

```text
packages/api-client/src/
├── client.ts
├── errors.ts
├── auth.ts
├── businesses.ts
├── availability.ts
├── bookings.ts
├── queue.ts
├── payments.ts
├── notifications.ts
└── index.ts
```

No React Query dependency is required inside the low-level client. React/React Native apps wrap client methods with their own TanStack Query hooks.

## 10. Realtime organization

Backend:

```text
apps/api/src/realtime/
├── realtime.module.ts
├── realtime.gateway.ts
├── room-authorization.service.ts
├── realtime-publisher.service.ts
└── dto/
```

Client apps:

```text
src/lib/realtime/
├── socket-client.ts
├── event-validator.ts
└── cache-reconciliation.ts
```

A WebSocket event updates/invalidates cache; it does not replace REST snapshot retrieval after reconnect.

## 11. Background job organization

Shared queue names/contracts should live in server-safe contracts, not UI packages.

Suggested server paths:

```text
apps/api/src/jobs/
apps/worker/src/processors/
```

Queues:

```text
notifications
booking-reminders
payments
analytics
cleanup
email
```

## 12. Infrastructure structure

```text
infrastructure/
├── docker/
│   ├── api.Dockerfile
│   └── worker.Dockerfile
└── scripts/
    ├── wait-for-postgres.sh
    └── smoke-health.sh
```

Local Docker Compose services:

```text
postgres
redis
minio
mailpit (optional)
```

## 13. Documentation ownership

- architecture/business source of truth: project overview + `docs/rules/*`
- DB schema rule: `01_DATABASE_SCHEMA.md`
- code style/implementation boundaries: `02_CODING_CONVENTIONS.md`
- REST/WS public contract: `03_API_SPECIFICATION.md`
- monorepo placement/import boundaries: this file
- state machines/concurrency: `05_STATE_MACHINES_AND_BUSINESS_RULES.md`
- RBAC: `06_ROLES_AND_PERMISSIONS.md`
- environment/config: `07_ENV_AND_CONFIG.md`

## 14. Where a new file belongs

| Change | Location |
|---|---|
| new REST controller | `apps/api/src/<module>/` |
| use-case/domain service | `apps/api/src/<module>/application` or `domain` |
| Prisma repository | `apps/api/src/<module>/infrastructure` |
| API DTO | `apps/api/src/<module>/dto` |
| reusable HTTP call | `packages/api-client/src/` |
| shared transport type | `packages/types/src/` |
| shared runtime validation | `packages/validation/src/` |
| customer page/feature | `apps/customer-web/src/...` |
| business dashboard feature | `apps/business-web/src/...` |
| platform admin feature | `apps/admin-web/src/...` |
| mobile feature | `apps/mobile/src/...` |
| worker processor | `apps/worker/src/processors/` |
| schema migration | `apps/api/prisma/migrations/` |
| architecture/rule update | `docs/rules/` |

## 15. Package creation rule

Do not create a new shared package just because two files look similar. A new package is justified only when:

1. at least two workspaces genuinely need the code,
2. the code has a stable responsibility,
3. sharing it does not cross a server/client boundary incorrectly,
4. the dependency graph remains acyclic and understandable.

## 16. Import hygiene

- Prefer package public exports over deep imports across workspace boundaries.
- Do not import another package's internal `src/**` path.
- Avoid circular module dependencies.
- Use dependency inversion for integrations rather than importing provider SDK details into domain services.
- Keep Node-only APIs out of packages consumed by browser/mobile bundles.

## 17. Build/test scope

Turborepo tasks should support affected-workspace execution for:

```text
lint
typecheck
test
build
```

CI sequence:

```text
install
-> lint
-> typecheck
-> unit test
-> integration test
-> build affected apps
```
