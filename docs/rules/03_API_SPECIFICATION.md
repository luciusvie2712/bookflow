# BookFlow — API Specification

**Status:** Canonical Rules/Context Document  
**Source:** `BookFlow_Project_Overview.md` v1.0 — 17/09/2026  
**Base path:** `/api/v1`  
**Scope:** REST contract shared by API, customer-web, business-web, admin-web and mobile.

> Client applications must not invent routes, payload wrappers or error codes. Any new public endpoint or breaking payload change must update this document first or in the same change set.

## 1. Transport conventions

- Protocol: HTTPS in non-local environments.
- Content type: `application/json` unless explicitly documented (uploads/webhooks).
- Request/response JSON fields: `camelCase`.
- Database names remain `snake_case` and are never exposed as an API naming requirement.
- Timestamps: ISO-8601 with `Z` or explicit offset.
- Money: integer minor units plus currency code.
- IDs: opaque UUID strings; clients must not infer semantics from IDs.
- Pagination: cursor by default for unbounded user-facing lists; page/limit allowed for bounded admin tables.

## 2. Standard response envelopes

### 2.1 Success

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

`meta` may be omitted when no metadata is needed.

### 2.2 Error

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_SLOT_UNAVAILABLE",
    "message": "The selected time slot is no longer available.",
    "details": {}
  }
}
```

Rules:

- `error.code` is stable and machine-readable.
- `error.message` is human-readable and may evolve.
- `details` must never expose secrets/internal stack traces.
- Clients switch on `code`, never parse `message`.

## 3. HTTP status mapping

| HTTP | Meaning |
|---:|---|
| `200` | successful query/mutation |
| `201` | resource created |
| `204` | successful mutation with no body |
| `400` | validation/domain input error |
| `401` | unauthenticated/invalid session |
| `403` | authenticated but not authorized |
| `404` | resource not found within authorized scope |
| `409` | conflict/concurrency/idempotency conflict |
| `422` | valid JSON but invalid domain state when 409 is not more appropriate |
| `429` | rate limited |
| `500` | unexpected server error |
| `503` | temporary dependency/readiness failure |

## 4. Canonical system error codes

The overview provides the domain catalog below. This document also adds a small generic transport/application set so clients have stable handling for common failures.

### 4.1 Generic/system

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
INTERNAL_ERROR
SERVICE_UNAVAILABLE
IDEMPOTENCY_KEY_REUSED
RATE_LIMITED
```

### 4.2 Authentication/tenant

```text
AUTH_INVALID_CREDENTIALS
AUTH_TOKEN_EXPIRED
TENANT_ACCESS_DENIED
```

### 4.3 Business/branch/service/staff

```text
BUSINESS_NOT_FOUND
BRANCH_CLOSED
SERVICE_NOT_AVAILABLE
STAFF_NOT_AVAILABLE
```

### 4.4 Booking

```text
BOOKING_SLOT_UNAVAILABLE
BOOKING_INVALID_STATE
BOOKING_CANCELLATION_WINDOW_PASSED
BOOKING_ALREADY_CHECKED_IN
```

### 4.5 Queue

```text
QUEUE_TICKET_ALREADY_EXISTS
QUEUE_INVALID_STATE
```

### 4.6 Voucher

```text
VOUCHER_INVALID
VOUCHER_EXPIRED
VOUCHER_USAGE_LIMIT_REACHED
```

### 4.7 Payment/refund

```text
PAYMENT_REQUIRED
PAYMENT_FAILED
PAYMENT_ALREADY_PROCESSED
REFUND_NOT_ALLOWED
```

### 4.8 QR

```text
QR_INVALID
QR_EXPIRED
```

## 5. Authentication and request context

Supported authentication:

- web: secure HttpOnly cookie strategy is preferred when deployed same-site/compatible.
- mobile/API bearer usage: short-lived access token + refresh token rotation.

The server resolves:

```ts
type RequestContext = {
  userId: string;
  requestId: string;
  currentBusinessId?: string;
  permissions?: string[];
};
```

`businessId` supplied by the client identifies a target resource only. Authorization still resolves/verifies tenant membership server-side.

## 6. Idempotency

Critical create/payment commands may accept:

```http
Idempotency-Key: <uuid>
```

Rules:

- Same key + same request hash returns/replays the original stored result.
- Same key + different request hash returns `IDEMPOTENCY_KEY_REUSED` (`409`).
- Payment webhook idempotency is additionally enforced by unique provider event ID.

## 7. Pagination

Cursor response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "nextCursor": "opaque-cursor",
    "hasNext": true
  }
}
```

Canonical query names:

```text
cursor
limit
```

Admin page pagination may use:

```text
page
limit
```

## 8. Sorting/filtering

- Do not expose arbitrary SQL sort expressions.
- Use documented enum-like sort keys.
- Date range filters use `from` / `to` ISO-8601 strings.
- Business analytics filters: `branchId`, `staffId`, `serviceId`.

## 9. Canonical REST endpoints

### 9.1 Auth

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | create account |
| POST | `/auth/login` | Public | authenticate |
| POST | `/auth/refresh` | Refresh session | rotate refresh token |
| POST | `/auth/logout` | Auth | revoke current session/family as policy requires |
| POST | `/auth/forgot-password` | Public | request reset |
| POST | `/auth/reset-password` | Reset token | reset password |
| GET | `/auth/me` | Auth | current user/session context |

### 9.2 Public discovery

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/businesses` | Public | search/discover published businesses |
| GET | `/businesses/:slug` | Public | business detail by public slug |
| GET | `/businesses/:businessId/branches` | Public | active/public branches |
| GET | `/businesses/:businessId/services` | Public | bookable services |
| GET | `/businesses/:businessId/staff` | Public | public staff list |
| GET | `/businesses/:businessId/reviews` | Public | published reviews |

Common discovery filters:

```text
q
category
location
lat
lng
radiusKm
rating
priceMinMinor
priceMaxMinor
availableToday
openNow
cursor
limit
```

`openNow` is calculated with branch timezone/opening hours, not browser local time.

### 9.3 Availability

Canonical endpoint:

```http
GET /availability?branchId=&serviceId=&staffId=&date=
```

- `staffId` is optional for “Any available staff”.
- `date` is a local calendar date (`YYYY-MM-DD`) interpreted using branch/business timezone.
- `businessId` is resolved through `branchId`/resource relations; do not require the client to provide authoritative tenant identity.

Example response:

```json
{
  "success": true,
  "data": {
    "date": "2026-09-20",
    "timezone": "Asia/Ho_Chi_Minh",
    "slots": [
      {
        "startAt": "2026-09-20T02:00:00.000Z",
        "endAt": "2026-09-20T02:30:00.000Z",
        "staffId": "uuid"
      }
    ]
  }
}
```

Availability is advisory for UX. Booking creation rechecks inside a protected DB transaction.

### 9.4 Customer booking

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/bookings` | Customer auth | create booking/hold |
| GET | `/bookings` | Customer auth | own booking history/upcoming |
| GET | `/bookings/:bookingId` | Authorized customer/business member | booking detail |
| POST | `/bookings/:bookingId/reschedule` | Authorized | concurrency-safe reschedule |
| POST | `/bookings/:bookingId/cancel` | Authorized | apply cancellation policy |
| POST | `/bookings/:bookingId/check-in` | Authorized | validate signed QR/check-in policy |
| GET | `/bookings/:bookingId/check-in-qr` | Authorized customer | signed/opaque check-in token |

Create booking request uses selection inputs, not client totals:

```json
{
  "branchId": "uuid",
  "serviceIds": ["uuid"],
  "staffId": "uuid-or-null",
  "startAt": "2026-09-20T02:00:00.000Z",
  "voucherCode": "OPTIONAL",
  "note": "Optional note"
}
```

Server computes duration, price, discount, deposit and total.

### 9.5 Business onboarding/profile

| Method | Path | Auth | Permission | Purpose |
|---|---|---|---|---|
| POST | `/businesses` | Auth | n/a | create a business owned by current user |
| GET | `/businesses/:businessId` | Member | `business.read` | private business detail |
| PATCH | `/businesses/:businessId` | Member | `business.update` | update business settings |
| POST | `/businesses/:businessId/publish` | Member | `business.update` | validate and publish business |

Publish validation requires at least one active branch, one active service, eligible staff/any-staff configuration and valid working hours.

### 9.6 Branch management

| Method | Path | Permission |
|---|---|---|
| GET | `/businesses/:businessId/branches` | `branch.read` for private data; public variant is filtered |
| POST | `/businesses/:businessId/branches` | `branch.manage` |
| GET | `/businesses/:businessId/branches/:branchId` | `branch.read` |
| PATCH | `/businesses/:businessId/branches/:branchId` | `branch.manage` |
| GET | `/businesses/:businessId/branches/:branchId/opening-hours` | `branch.read` |
| PUT | `/businesses/:businessId/branches/:branchId/opening-hours` | `branch.manage` |

Deactivate/archive rather than hard-delete when historical relations exist.

### 9.7 Service management

| Method | Path | Permission |
|---|---|---|
| GET | `/businesses/:businessId/services` | `service.read` |
| POST | `/businesses/:businessId/services` | `service.manage` |
| GET | `/businesses/:businessId/services/:serviceId` | `service.read` |
| PATCH | `/businesses/:businessId/services/:serviceId` | `service.manage` |
| POST | `/businesses/:businessId/services/:serviceId/deactivate` | `service.manage` |
| GET | `/businesses/:businessId/service-categories` | `service.read` |
| POST | `/businesses/:businessId/service-categories` | `service.manage` |
| PATCH | `/businesses/:businessId/service-categories/:categoryId` | `service.manage` |

### 9.8 Staff and schedules

| Method | Path | Permission |
|---|---|---|
| GET | `/businesses/:businessId/staff` | `staff.read` |
| POST | `/businesses/:businessId/staff` | `staff.manage` |
| GET | `/businesses/:businessId/staff/:staffId` | `staff.read` |
| PATCH | `/businesses/:businessId/staff/:staffId` | `staff.manage` |
| POST | `/businesses/:businessId/staff/:staffId/deactivate` | `staff.manage` |
| GET | `/businesses/:businessId/staff/:staffId/working-hours` | `schedule.read` |
| PUT | `/businesses/:businessId/staff/:staffId/working-hours` | `schedule.manage` |
| GET | `/businesses/:businessId/staff/:staffId/breaks` | `schedule.read` |
| PUT | `/businesses/:businessId/staff/:staffId/breaks` | `schedule.manage` |
| GET | `/businesses/:businessId/staff/:staffId/leaves` | `schedule.read` |
| POST | `/businesses/:businessId/staff/:staffId/leaves` | `schedule.manage` |
| PATCH | `/businesses/:businessId/staff/:staffId/leaves/:leaveId` | `schedule.manage` |
| GET | `/businesses/:businessId/schedule-blocks` | `schedule.read` |
| POST | `/businesses/:businessId/schedule-blocks` | `schedule.manage` |
| DELETE | `/businesses/:businessId/schedule-blocks/:blockId` | `schedule.manage` |

### 9.9 Business booking/calendar operations

| Method | Path | Permission |
|---|---|---|
| GET | `/businesses/:businessId/bookings` | `booking.read` |
| POST | `/businesses/:businessId/bookings` | `booking.create` |
| GET | `/businesses/:businessId/bookings/:bookingId` | `booking.read` |
| POST | `/businesses/:businessId/bookings/:bookingId/reschedule` | `booking.update` |
| POST | `/businesses/:businessId/bookings/:bookingId/cancel` | `booking.cancel` |
| POST | `/businesses/:businessId/bookings/:bookingId/start` | `booking.update` |
| POST | `/businesses/:businessId/bookings/:bookingId/complete` | `booking.update` |
| POST | `/businesses/:businessId/bookings/:bookingId/no-show` | `booking.update` |

Manual booking uses the same availability/concurrency checks as customer booking.

### 9.10 Queue

| Method | Path | Permission/Auth |
|---|---|---|
| GET | `/branches/:branchId/queue` | authorized business member or authorized customer snapshot |
| POST | `/branches/:branchId/queue/walk-in` | `queue.manage` |
| POST | `/queue-tickets/:ticketId/call` | `queue.manage` |
| POST | `/queue-tickets/:ticketId/start` | `queue.manage` |
| POST | `/queue-tickets/:ticketId/complete` | `queue.manage` |
| POST | `/queue-tickets/:ticketId/skip` | `queue.manage` |
| POST | `/queue-tickets/:ticketId/cancel` | `queue.manage` |

All queue ticket mutations validate branch/business tenant scope and state transition.

### 9.11 Customer CRM

| Method | Path | Permission |
|---|---|---|
| GET | `/businesses/:businessId/customers` | `customer.read` |
| GET | `/businesses/:businessId/customers/:customerId` | `customer.read` |
| PATCH | `/businesses/:businessId/customers/:customerId` | `customer.manage` |
| GET | `/businesses/:businessId/customers/:customerId/bookings` | `customer.read` |

Business A must never see Business B CRM data for the same global user.

### 9.12 Payments and refunds

| Method | Path | Auth/Permission |
|---|---|---|
| POST | `/bookings/:bookingId/payment-intent` | authorized customer/business operation |
| GET | `/businesses/:businessId/payments` | `payment.read` |
| GET | `/businesses/:businessId/payments/:paymentId` | `payment.read` |
| POST | `/payments/:paymentId/refund` | `booking.refund` or `payment.refund` |
| GET | `/businesses/:businessId/payment-configurations` | `payment.read` |
| PUT | `/businesses/:businessId/payment-configurations/:provider` | `payment.manage` |
| POST | `/webhooks/payments/:provider` | provider signature, no user auth |

Webhook rules:

- raw body when required
- signature verification
- unique provider event ID
- idempotent processing
- browser redirect is never payment source of truth

### 9.13 Vouchers/promotions

| Method | Path | Permission |
|---|---|---|
| GET | `/businesses/:businessId/vouchers` | `voucher.read` |
| POST | `/businesses/:businessId/vouchers` | `voucher.manage` |
| GET | `/businesses/:businessId/vouchers/:voucherId` | `voucher.read` |
| PATCH | `/businesses/:businessId/vouchers/:voucherId` | `voucher.manage` |
| POST | `/businesses/:businessId/vouchers/:voucherId/deactivate` | `voucher.manage` |
| POST | `/vouchers/validate` | customer auth/public booking context as policy allows |

Validation order: active/existence -> time window -> applicability -> minimum amount -> global limit -> customer limit -> capped discount calculation.

### 9.14 Reviews

| Method | Path | Auth/Permission |
|---|---|---|
| POST | `/bookings/:bookingId/review` | booking customer; booking must be `COMPLETED` |
| GET | `/businesses/:businessId/reviews` | public filtered or `review.read` private view |
| POST | `/businesses/:businessId/reviews/:reviewId/reply` | `review.reply` |

One review per booking. Business may reply but may not edit customer review content.

### 9.15 Notifications/devices

| Method | Path | Auth |
|---|---|---|
| GET | `/notifications` | current user |
| POST | `/notifications/:notificationId/read` | current user |
| POST | `/notifications/read-all` | current user |
| POST | `/devices` | current user |
| DELETE | `/devices/:deviceId` | current user |

### 9.16 Roles, members and permissions

| Method | Path | Permission |
|---|---|---|
| GET | `/businesses/:businessId/members` | `member.read` |
| POST | `/businesses/:businessId/members/invite` | `member.manage` |
| PATCH | `/businesses/:businessId/members/:memberId` | `member.manage` |
| GET | `/businesses/:businessId/roles` | `role.read` |
| POST | `/businesses/:businessId/roles` | `role.manage` |
| PATCH | `/businesses/:businessId/roles/:roleId` | `role.manage` |
| DELETE | `/businesses/:businessId/roles/:roleId` | `role.manage` |
| GET | `/permissions` | authenticated business user |
| PUT | `/businesses/:businessId/roles/:roleId/permissions` | `role.manage` |

Role names do not replace permission checks.

### 9.17 Analytics/dashboard

| Method | Path | Permission |
|---|---|---|
| GET | `/businesses/:businessId/dashboard` | `analytics.read` |
| GET | `/businesses/:businessId/analytics` | `analytics.read` |

Filters:

```text
from
to
branchId
staffId
serviceId
```

### 9.18 Files/media

Canonical presigned-upload flow:

| Method | Path | Purpose |
|---|---|---|
| POST | `/files/presign-upload` | validate MIME/size/scope and return signed upload URL |
| POST | `/files/confirm-upload` | persist/confirm object metadata |

The API validates tenant namespace and ownership; binary upload goes directly to R2/S3-compatible storage.

### 9.19 Subscription/feature gating

| Method | Path | Permission |
|---|---|---|
| GET | `/businesses/:businessId/subscription` | `subscription.read` |
| POST | `/businesses/:businessId/subscription/change` | `subscription.manage` |
| GET | `/businesses/:businessId/features` | authenticated member |

Server-side feature/limit enforcement is authoritative.

### 9.20 Platform admin

Platform admin routes are isolated under `/admin`:

```text
GET   /admin/businesses
GET   /admin/businesses/:businessId
POST  /admin/businesses/:businessId/suspend
POST  /admin/businesses/:businessId/restore
GET   /admin/users
GET   /admin/subscriptions
GET   /admin/transactions
GET   /admin/reports
GET   /admin/audit-logs
```

Do not reuse tenant member permission guards as the only protection for platform-admin routes.

### 9.21 Health

```text
GET /health/live
GET /health/ready
```

`live` checks process liveness. `ready` checks critical dependencies to a reasonable depth.

## 10. WebSocket contract

Rooms:

```text
business:{businessId}
branch:{branchId}
customer:{customerId}
staff:{staffId}
```

Server-side room authorization is mandatory.

Events:

```text
booking.created
booking.updated
booking.cancelled
queue.snapshot
queue.updated
queue.ticket.called
queue.ticket.serving
queue.ticket.completed
notification.created
staff.status.updated
```

Canonical event envelope:

```json
{
  "event": "queue.updated",
  "version": 1,
  "occurredAt": "2026-09-17T03:30:00.000Z",
  "data": {
    "branchId": "uuid",
    "ticketId": "uuid"
  }
}
```

After reconnect, clients fetch a fresh snapshot. WebSocket is not a state database.

## 11. Contract change policy

A contract change requires synchronized updates to:

- this file
- NestJS controller/DTO/OpenAPI
- `packages/api-client`
- shared runtime schemas/types where applicable
- affected web/mobile consumers
- integration/E2E tests

Breaking changes should introduce a compatible migration/version strategy rather than silently changing existing consumers.
