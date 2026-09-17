# BookFlow — Coding Conventions

**Status:** Canonical Rules/Context Document  
**Source:** `BookFlow_Project_Overview.md` v1.0 — 17/09/2026  
**Scope:** TypeScript, NestJS, Next.js, React Native/Expo, shared packages, validation, logging, error handling and tests.

## 1. Core engineering rules

1. TypeScript `strict` mode is mandatory.
2. Do not use `any` except at a narrowly-contained external boundary with an explicit runtime validator immediately after it.
3. No business logic in controllers, gateways or React components.
4. No mock-only implementation in a production feature path.
5. All critical mutations validate input, authorization, tenant scope, domain state and transaction boundary.
6. All tenant-scoped queries receive trusted `businessId` from authenticated context, never from arbitrary body input.
7. Money and timestamps follow `01_DATABASE_SCHEMA.md`.
8. Controllers/gateways are transport adapters; application services/use cases orchestrate; domain services own complex business rules; repositories/adapters perform persistence/integration.
9. Reuse code only across correct architectural boundaries. Do not create “shared” packages that leak server-only implementation into clients.
10. Prefer KISS, explicit domain naming and testability over ceremonial DDD abstractions.

## 2. Naming conventions

### 2.1 Database

- tables/columns/index names: `snake_case`
- examples: `business_id`, `hold_expires_at`, `booking_services`
- TypeScript/Prisma field mapped to DB: `businessId @map("business_id")`

### 2.2 TypeScript

| Item | Convention | Example |
|---|---|---|
| variable/function | `camelCase` | `calculateAvailability` |
| class/interface/type/enum | `PascalCase` | `BookingService`, `BookingStatus` |
| constants | `UPPER_SNAKE_CASE` | `DEFAULT_SLOT_INTERVAL_MINUTES` |
| boolean | positive predicate | `isActive`, `canRefund`, `hasNext` |
| ID variable | `<entity>Id` | `businessId`, `bookingId` |
| timestamps | `*At` | `createdAt`, `holdExpiresAt` |
| durations | explicit unit | `durationMinutes`, `timeoutMs` |
| money | explicit minor unit | `priceMinor`, `totalMinor` |

### 2.3 Files and folders

- folders: `kebab-case`
- source files: `kebab-case.ts` / `kebab-case.tsx`
- NestJS class suffixes:
  - `*.controller.ts`
  - `*.service.ts`
  - `*.repository.ts`
  - `*.module.ts`
  - `*.guard.ts`
  - `*.decorator.ts`
  - `*.strategy.ts`
  - `*.gateway.ts`
  - `*.processor.ts`
  - `*.dto.ts`
  - `*.spec.ts`
  - `*.integration-spec.ts`
- React hooks: `use-<feature>.ts`
- React components: filename `kebab-case.tsx`, exported component `PascalCase`

## 3. Backend architecture

Canonical dependency direction:

```text
Controller / WebSocket Gateway
        ↓
Application Service / Use Case
        ↓
Domain Rules / Policies
        ↓
Repository / External Adapter
```

### 3.1 Controller rules

Controller responsibilities only:

- route binding
- authentication/authorization decorators
- DTO parsing/validation
- retrieving trusted request context
- invoking one application use case/service
- mapping application result to API response

Forbidden in controllers:

- Prisma queries
- price/deposit calculation
- availability calculation
- queue ordering
- state transitions
- payment provider orchestration
- tenant filter construction from request body

### 3.2 Application service rules

Application services orchestrate a business operation and own the transaction boundary where required.

Examples:

- `CreateBookingService`
- `RescheduleBookingService`
- `CancelBookingService`
- `CalculateAvailabilityService`
- `CheckInBookingService`
- `CallQueueTicketService`
- `ProcessPaymentWebhookService`

A service method should have one clear command/query input and one explicit result type.

### 3.3 Repository rules

Tenant repositories must make tenant scope impossible to forget:

```ts
export type TenantContext = Readonly<{
  businessId: string;
  actorUserId: string;
  requestId: string;
}>;

export interface BookingRepository {
  findById(context: TenantContext, bookingId: string): Promise<Booking | null>;
}
```

Do not expose generic repository methods such as `findById(id)` for tenant-owned resources.

### 3.4 Prisma usage

- Prisma is allowed only in repository/infrastructure/application persistence code, not UI/controller layers.
- Use `$transaction` for critical multi-write operations.
- Booking create/reschedule must use DB concurrency control described in `05_STATE_MACHINES_AND_BUSINESS_RULES.md`.
- Do not depend on Redis lock as the only double-booking protection.
- Avoid N+1 queries on list/calendar/analytics screens.

## 4. Validation rules

All request mutations (`POST`, `PUT`, `PATCH`, `DELETE` with body/params) require runtime validation at the boundary.

Canonical backend default: NestJS DTO + `class-validator`/`class-transformer`. Zod is also allowed for shared schemas where it reduces duplication, but a module must not mix validators arbitrarily.

Validation must cover:

- path params
- query params
- request body
- enum/domain syntax
- email/phone/code normalization
- range validation
- cross-field validation when safe at the boundary

Domain/state validation still belongs in the application/domain service.

Never silently coerce dangerous inputs such as invalid dates, money strings or arbitrary IDs.

## 5. Authentication, tenant context and authorization

Business mutation check order:

```text
Authentication
-> Business membership
-> Permission
-> Tenant scope
-> Resource state
-> Mutation
```

Rules:

- Resolve `businessId` from authenticated membership/current-tenant context for business-scoped endpoints.
- A route parameter `:businessId` may identify the target tenant, but it must be verified against authenticated membership before use.
- Never trust `businessId` from a request body as proof of tenant access.
- Platform admin is a separate platform-level authorization path; do not bypass tenant isolation implicitly.
- Permission checks use permission codes, not hard-coded role names.

## 6. Error handling

Use typed domain/application errors and map them to the standard API envelope.

```ts
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
```

Rules:

- Clients branch on `error.code`, never parse human-readable messages.
- Never leak stack traces, raw Prisma errors, secrets or payment credentials.
- Database uniqueness/conflict errors must be converted to a domain-specific code when meaningful.
- Unexpected exceptions are logged with `requestId` and returned as a generic internal error.

Canonical error codes are defined in `03_API_SPECIFICATION.md`.

## 7. Logging and observability

Use structured JSON logs.

Required context when applicable:

- `event`
- `requestId` / `correlationId`
- `businessId`
- `actorUserId`
- resource ID (`bookingId`, `paymentId`, etc.)
- `durationMs`
- safe error metadata

Never log:

- passwords
- access/refresh tokens
- QR signing secret/token payload secrets
- full payment credentials
- provider secret keys

Domain event names use dotted lowercase form:

```text
booking.created
booking.confirmed
queue.ticket.called
payment.succeeded
```

## 8. Time and timezone conventions

- Persist instants as UTC.
- Use IANA timezone identifiers such as `Asia/Ho_Chi_Minh`.
- Working hours are local wall-clock rules, not UTC recurring timestamps.
- API returns ISO-8601 with explicit offset or `Z` according to contract.
- Never parse timezone-less timestamp strings as an instant.
- DST behavior must be delegated to a timezone-aware library.
- Name variables to distinguish `localDate`, `localTime`, `startAtUtc` where ambiguity exists.

## 9. Money conventions

- Use integer minor units in persisted/API financial fields.
- Do not use JS floating point for financial arithmetic.
- Server computes subtotal, discount, deposit and total.
- Client sends selections/identifiers, not authoritative total amounts.
- Booking service name/price/duration are snapshotted at booking time.

Recommended helper naming:

```ts
calculateDepositMinor(...)
calculateDiscountMinor(...)
formatMoney(...)
```

## 10. Frontend server state

TanStack Query is mandatory for remote/server state.

Use it for:

- API reads
- mutation lifecycle
- cache invalidation
- pagination/infinite queries
- loading/error states
- refetch on realtime reconciliation

Do not duplicate server entities into Zustand if TanStack Query already owns them.

## 11. Frontend client state

Zustand is for lightweight client/UI/session state only, for example:

- transient filters
- modal/drawer UI state
- wizard progress that is not server state
- short-lived client preferences

Do not use Zustand as an ad-hoc API cache.

## 12. API access from clients

Forbidden:

```ts
// React component
const response = await fetch('/api/...');
```

Required layering:

```text
React Component
-> feature hook
-> packages/api-client
-> HTTP API
```

Example:

```ts
export function useBooking(bookingId: string) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getById(bookingId),
  });
}
```

The API client owns:

- base URL
- auth/session transport
- serialization
- standard response envelope parsing
- typed API errors
- request ID/idempotency headers where needed

## 13. React component rules

Components should primarily:

- render UI
- compose hooks
- handle local interaction
- show loading/error/empty/success states

Move complex logic out of components into:

- feature hooks
- pure utility/domain functions
- form schemas
- API client methods

Do not embed booking availability, permission or pricing logic in React components.

## 14. Forms

Web default:

- React Hook Form
- Zod schema where shared/client validation is useful

Rules:

- Client validation improves UX only; backend validation remains authoritative.
- Server error codes must map to form/global error states.
- Never assume optimistic success for conflict-prone booking reschedule/create.

## 15. Realtime conventions

WebSocket event handling:

```text
receive event
-> validate envelope/version
-> authorize room already server-side
-> update or invalidate TanStack Query cache
-> render current state
```

After reconnect, refetch a fresh snapshot. Do not assume all events during disconnection were received.

Event payloads must be versioned for important contracts.

## 16. Background jobs

- Request handlers do not send email/push directly.
- Enqueue BullMQ jobs after transactional state is committed.
- Retryable vs permanent failures must be classified.
- Jobs that may retry require deterministic `jobId`/idempotency key.
- Job processors must be safe against duplicate delivery.

## 17. External integrations

Wrap provider SDKs behind interfaces/adapters.

Examples:

```ts
interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook(input: RawWebhookInput): Promise<VerifiedPaymentEvent>;
  refund(input: RefundInput): Promise<RefundResult>;
}
```

Do not scatter provider-specific Stripe/VNPay/MoMo calls across domain services.

## 18. Webhook conventions

- Preserve raw request body when provider signature verification requires it.
- Verify signature before trusting payload.
- Store provider event ID and enforce idempotency.
- Do not mark payment `PAID` from frontend redirect/callback state alone.
- Duplicate webhook delivery must be safe.

## 19. Security conventions

- Password hashing: Argon2 or appropriately-configured bcrypt.
- Rate-limit login/reset and abuse-prone endpoints.
- Secure HttpOnly cookies when cookie auth is used.
- Mobile tokens stored in Expo SecureStore.
- CORS allowlist; never use permissive wildcard with credentialed auth.
- Validate upload MIME/size and generate randomized object keys.
- Secrets only in environment/secret store.

## 20. Import rules

Allowed dependency direction:

```text
apps/*
  -> packages/api-client
  -> packages/types
  -> packages/validation
  -> packages/ui (web apps where compatible)
  -> packages/domain-contracts
```

Forbidden:

- client/mobile importing `apps/api/**`
- client/mobile importing Prisma/NestJS/server-only packages
- `packages/ui` importing application-specific API clients
- shared packages importing one specific app
- backend importing React/Next.js/Expo UI packages

Detailed boundaries are in `04_PROJECT_STRUCTURE.md`.

## 21. Testing conventions

### Unit tests

Prioritize pure domain rules:

- availability intervals
- pricing/deposit
- voucher calculation
- booking state transitions
- queue ordering
- permission policies

### Integration tests

Mandatory for:

- booking concurrency
- tenant isolation
- DB constraints
- payment webhook idempotency
- notification enqueue

### E2E

Critical flow:

```text
business onboarding
-> configure branch/service/staff
-> customer search/book
-> business sees booking
-> QR check-in
-> queue progression
-> complete service
-> review
```

## 22. Code quality checklist

Before considering a feature complete:

- [ ] strict typing, no uncontrolled `any`
- [ ] validation at boundary
- [ ] permission/tenant isolation enforced server-side
- [ ] domain state transition validated
- [ ] critical write transaction correct
- [ ] error code mapped
- [ ] structured logging present
- [ ] loading/error/empty UI states implemented
- [ ] tests cover critical path/edge cases
- [ ] docs/API spec updated if contract changed
- [ ] no TODO/mock in critical path
