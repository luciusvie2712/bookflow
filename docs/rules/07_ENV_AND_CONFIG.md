# BookFlow — Environment & Configuration Standard

**Status:** Canonical Rules/Context Document  
**Source:** `BookFlow_Project_Overview.md` v1.0 — 17/09/2026  
**Scope:** Environment variables, secret boundaries, runtime config, feature codes and configuration validation.

## 1. Configuration principles

1. Secrets are never committed to git.
2. Every app owns an `.env.example` containing names only/safe sample values.
3. Server-only secrets must never use `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefixes.
4. Browser/mobile-exposed environment variables must be safe to disclose publicly.
5. Production server config fails fast when required values are missing/invalid.
6. Business-specific rules (timezone, currency, cancellation policy, queue policy, booking policy) belong in persisted business/branch settings, not global environment variables unless they are only system defaults.
7. Feature entitlement is enforced server-side. UI flags are not authorization.
8. Do not hard-code VND or `Asia/Ho_Chi_Minh` globally; tenant settings decide currency/timezone.

## 2. Environment file layout

Recommended local files:

```text
.env.example                         # optional root orchestration values
apps/api/.env.example
apps/worker/.env.example
apps/customer-web/.env.example
apps/business-web/.env.example
apps/admin-web/.env.example
apps/mobile/.env.example
```

Actual local secret files are gitignored.

## 3. Root `.env.example`

Use only values needed by Docker Compose/local orchestration.

```dotenv
COMPOSE_PROJECT_NAME=bookflow

POSTGRES_DB=bookflow
POSTGRES_USER=bookflow
POSTGRES_PASSWORD=bookflow_local_only
POSTGRES_PORT=5432

REDIS_PORT=6379

MINIO_ROOT_USER=minio_local
MINIO_ROOT_PASSWORD=minio_local_password
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

MAILPIT_SMTP_PORT=1025
MAILPIT_UI_PORT=8025
```

These sample credentials are local-development only.

## 4. `apps/api/.env.example`

```dotenv
# Runtime
NODE_ENV=development
PORT=4000
LOG_LEVEL=info
APP_ENV=local

# Public/application URLs
APP_URL=http://localhost:4000
CUSTOMER_WEB_URL=http://localhost:3000
BUSINESS_WEB_URL=http://localhost:3001
ADMIN_WEB_URL=http://localhost:3002

# CORS / cookies
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
COOKIE_DOMAIN=
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# PostgreSQL / Prisma
DATABASE_URL=postgresql://bookflow:bookflow_local_only@localhost:5432/bookflow?schema=public
DIRECT_DATABASE_URL=postgresql://bookflow:bookflow_local_only@localhost:5432/bookflow?schema=public

# Redis / BullMQ / Socket.IO adapter
REDIS_URL=redis://localhost:6379

# Authentication
JWT_ACCESS_SECRET=replace_with_long_random_secret
JWT_REFRESH_SECRET=replace_with_different_long_random_secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
PASSWORD_HASH_ALGORITHM=argon2

# QR signing
QR_SIGNING_SECRET=replace_with_dedicated_random_secret
QR_TOKEN_TTL_MINUTES=1440

# Booking defaults
BOOKING_HOLD_TTL_MINUTES=10
BOOKING_SLOT_INTERVAL_MINUTES=15

# Rate limiting
AUTH_RATE_LIMIT_WINDOW_SECONDS=60
AUTH_RATE_LIMIT_MAX_REQUESTS=10
API_RATE_LIMIT_WINDOW_SECONDS=60
API_RATE_LIMIT_MAX_REQUESTS=120

# Object storage (R2/S3-compatible)
R2_ENDPOINT=http://localhost:9000
R2_ACCESS_KEY_ID=minio_local
R2_SECRET_ACCESS_KEY=minio_local_password
R2_BUCKET=bookflow
R2_PUBLIC_BASE_URL=http://localhost:9000/bookflow
R2_REGION=auto

# Upload limits
UPLOAD_MAX_IMAGE_BYTES=10485760
UPLOAD_ALLOWED_IMAGE_MIME_TYPES=image/jpeg,image/png,image/webp

# Stripe sandbox/international demo
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Optional future payment adapters
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_PAYMENT_URL=
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=

# Email
EMAIL_PROVIDER=console
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=no-reply@bookflow.local
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=

# Push / Expo
EXPO_ACCESS_TOKEN=

# Observability
SENTRY_DSN=
SENTRY_ENVIRONMENT=local

# OpenAPI
SWAGGER_ENABLED=true
SWAGGER_PATH=/docs

# Health/readiness
HEALTH_CHECK_TIMEOUT_MS=3000
```

## 5. API required-variable policy

### Required in production

At minimum:

```text
NODE_ENV
PORT
APP_URL
CUSTOMER_WEB_URL
BUSINESS_WEB_URL
ADMIN_WEB_URL
DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
QR_SIGNING_SECRET
R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
```

Payment/email/push provider variables are required only when the corresponding production feature/provider is enabled.

### Secret separation

The following must never reach browser/mobile bundles:

```text
DATABASE_URL
DIRECT_DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
QR_SIGNING_SECRET
R2_SECRET_ACCESS_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
VNPAY_HASH_SECRET
MOMO_SECRET_KEY
EMAIL_PROVIDER_API_KEY
EXPO_ACCESS_TOKEN
```

## 6. `apps/worker/.env.example`

The worker uses server-only configuration and may share values with API deployment through the secret manager.

```dotenv
NODE_ENV=development
LOG_LEVEL=info
APP_ENV=local

DATABASE_URL=postgresql://bookflow:bookflow_local_only@localhost:5432/bookflow?schema=public
REDIS_URL=redis://localhost:6379

# Payment reconciliation/refund jobs
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=

# Notification delivery
EMAIL_PROVIDER=console
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=no-reply@bookflow.local
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
EXPO_ACCESS_TOKEN=

# Object storage if background jobs process media
R2_ENDPOINT=http://localhost:9000
R2_ACCESS_KEY_ID=minio_local
R2_SECRET_ACCESS_KEY=minio_local_password
R2_BUCKET=bookflow
R2_REGION=auto

# Observability
SENTRY_DSN=
SENTRY_ENVIRONMENT=local

# Job behavior
JOB_DEFAULT_ATTEMPTS=5
JOB_BACKOFF_BASE_MS=1000
BOOKING_HOLD_TTL_MINUTES=10
```

Do not create divergent values for shared invariants such as hold TTL between API and worker. Prefer a centralized deployment configuration source.

## 7. `apps/customer-web/.env.example`

Only public/browser-safe values:

```dotenv
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:4000
NEXT_PUBLIC_CUSTOMER_WEB_URL=http://localhost:3000
NEXT_PUBLIC_SENTRY_DSN=
```

If adding map/geolocation provider keys, use only provider keys explicitly designed for public browser exposure and restrict them by origin/domain.

## 8. `apps/business-web/.env.example`

```dotenv
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:4000
NEXT_PUBLIC_BUSINESS_WEB_URL=http://localhost:3001
NEXT_PUBLIC_SENTRY_DSN=
```

Do not expose tenant secrets or payment provider secret keys to the business dashboard.

## 9. `apps/admin-web/.env.example`

```dotenv
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_ADMIN_WEB_URL=http://localhost:3002
NEXT_PUBLIC_SENTRY_DSN=
```

Platform-admin authorization is enforced by API; no frontend env flag may grant admin access.

## 10. `apps/mobile/.env.example`

Expo public variables are embedded in the application bundle and must be treated as public.

```dotenv
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000/api/v1
EXPO_PUBLIC_WS_URL=http://10.0.2.2:4000
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_EAS_PROJECT_ID=
```

Do not place access/refresh tokens or provider secret keys in Expo environment variables. Runtime auth tokens go to SecureStore.

## 11. Runtime configuration validation

Backend must validate configuration at startup.

Recommended shape:

```ts
export type AppConfig = Readonly<{
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  booking: {
    holdTtlMinutes: number;
    slotIntervalMinutes: number;
  };
}>;
```

Validation requirements:

- URL variables parse as valid URLs where appropriate.
- ports are valid integers.
- TTL/duration values are positive and bounded.
- production secrets meet minimum length/entropy policy.
- `COOKIE_SECURE=true` in HTTPS production cookie deployments.
- missing enabled-provider credentials cause startup failure or provider-specific feature disablement according to explicit configuration.

## 12. Canonical application defaults

These are system defaults, not substitutes for business-specific settings:

| Config | Canonical default | Source basis |
|---|---:|---|
| Booking hold TTL | `10 minutes` | overview allows 5–10 minutes; choose upper bound as baseline |
| Slot interval | `15 minutes` | overview example |
| Booking reminder | `24h before` | required notification type |
| Booking reminder | `1h before` | required notification type |
| API base path | `/api/v1` | overview |

If a business-level booking configuration is later persisted, business settings override applicable defaults.

## 13. Business/branch configuration — NOT environment variables

The following belong to persisted tenant configuration:

```text
business timezone
business currency
branch timezone override
branch opening hours
branch booking enabled
branch queue enabled
service duration/buffers
service deposit policy
minimum booking lead time
maximum booking advance window
cancellation window/refund policy
queue appointment grace policy
check-in early/late window
```

Do not turn per-tenant policy into global environment variables.

## 14. Feature codes vs rollout flags

BookFlow has two different concepts.

### 14.1 Subscription feature codes

Persisted in `plan_features` and checked server-side.

Canonical initial codes from the plan matrix/concepts:

```text
advanced_analytics
custom_roles
api_access
```

Capacity limits are also plan features/limits, for example:

```text
branches_limit
staff_limit
monthly_bookings_limit
```

The exact plan matrix starts with:

```text
Free:     1 branch, 3 staff, 100 monthly bookings, Basic analytics
Pro:      3 branches, 15 staff, 3000 monthly bookings, Advanced analytics, Custom roles
Business: Unlimited branches/staff/bookings, Advanced analytics, Custom roles, API access
```

### 14.2 Platform rollout flags

The overview requires platform-admin feature-flag capability but does not define a canonical flag catalog or persistence table.

**Rule:** Do not invent persistent global feature-flag names/tables in implementation. When a real rollout flag is introduced, add it to this document and define its storage/owner explicitly.

## 15. Config constants that belong in code

Stable semantic constants may live in server-safe config modules:

```ts
export const BOOKING_OCCUPIED_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_SERVICE',
] as const;

export const TERMINAL_BOOKING_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'EXPIRED',
] as const;
```

Do not use environment variables for fixed domain vocabulary such as state names or permission codes.

## 16. Redis key namespace

Canonical prefix:

```text
bookflow:
```

Examples:

```text
bookflow:cache:business:{businessId}
bookflow:availability:{businessId}:{branchId}:{staffId}:{serviceId}:{date}
bookflow:rate:{key}
bookflow:ws:...
```

Every tenant-scoped cache key includes tenant/resource identity and an explicit TTL where applicable.

## 17. Object-storage key namespace

Tenant assets must be namespaced:

```text
businesses/{businessId}/...
```

Object keys are randomized/opaque; do not rely on user-provided filenames for uniqueness or authorization.

Private assets use signed read URLs.

## 18. Environment-specific behavior

### Development

- Swagger enabled
- local Postgres/Redis/MinIO/Mailpit allowed
- demo seed allowed
- detailed logs allowed without secrets

### Test

- isolated test DB/schema
- deterministic job/payment fakes may be used only in test infrastructure
- no calls to real payment/email providers

### Production

- fail-fast config validation
- secure cookies if cookie auth is used
- restricted CORS
- real secret manager/platform secrets
- Swagger exposure decided explicitly
- no demo credentials/seed
- Sentry/observability configured as appropriate

## 19. `.gitignore` expectations

At minimum ignore:

```gitignore
.env
.env.*
!.env.example
*.local
```

If framework tooling uses specific public sample files, keep only sanitized examples committed.

## 20. Secret rotation

Secrets should be independently rotatable where practical:

- access JWT secret
- refresh JWT secret
- QR signing secret
- payment webhook secret
- object storage credentials
- provider API keys

Do not reuse one secret for JWT access, refresh and QR signing.

## 21. Configuration change control

Adding/removing/renaming an environment variable or feature code requires updates to:

- this file
- relevant `.env.example`
- runtime validation schema
- deployment configuration
- CI/CD secrets documentation if applicable
- README when developer setup changes
