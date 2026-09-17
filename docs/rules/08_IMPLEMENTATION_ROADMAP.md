# BOOKFLOW — IMPLEMENTATION ROADMAP

**Document:** `08_IMPLEMENTATION_ROADMAP.md`  
**Purpose:** Kế hoạch triển khai toàn bộ BookFlow từ repository rỗng đến portfolio-grade production-oriented deployment.  
**Status:** Canonical execution roadmap.  
**Source of truth:** `BookFlow_Project_Overview.md` và bộ Rules/Context Docs `01` → `07`.  
**Last updated:** 2026-09-17

---

# 0. CÁCH SỬ DỤNG TÀI LIỆU NÀY

Tài liệu này không thay thế business requirements. Nó chuyển các requirements và architectural decisions đã có thành **thứ tự triển khai có dependency rõ ràng**.

Mỗi phase có:

- Mục tiêu.
- Preconditions.
- Task checklist.
- Deliverables.
- Tests bắt buộc.
- Exit criteria.
- Các lỗi kiến trúc không được phép mắc.

## 0.1 Source priority

Khi có xung đột:

1. `BookFlow_Project_Overview.md`.
2. `01_DATABASE_SCHEMA.md`.
3. `05_STATE_MACHINES_AND_BUSINESS_RULES.md`.
4. `03_API_SPECIFICATION.md`.
5. `06_ROLES_AND_PERMISSIONS.md`.
6. `02_CODING_CONVENTIONS.md`.
7. `04_PROJECT_STRUCTURE.md`.
8. `07_ENV_AND_CONFIG.md`.
9. Tài liệu roadmap này.
10. Implementation detail trong code.

Nếu thay đổi business rule chính thức, phải cập nhật tài liệu trước hoặc cùng lúc với code.

## 0.2 Global invariants

Mọi phase phải giữ các invariant sau:

- PostgreSQL là transactional source of truth cho booking/payment.
- Redis không phải permanent source of truth.
- Mọi tenant-scoped data phải được cô lập theo `business_id`.
- Client không được tùy ý quyết định `business_id` cho business mutation.
- Booking create/reschedule phải concurrency-safe ở backend/database.
- Payment webhook phải signature-verified và idempotent.
- QR check-in phải signed hoặc dùng opaque secure token.
- Money không được tính bằng JavaScript floating point.
- Timestamp lưu UTC; business/branch dùng IANA timezone.
- Controller/Gateway không chứa business logic phức tạp.
- Frontend component không gọi API trực tiếp.
- Realtime event phải authorize room/channel.
- Sau WebSocket reconnect phải refetch snapshot.
- Critical side effects chạy post-commit/background job.
- Không dùng mock-only implementation cho critical path.
- Schema change phải có migration.
- Mỗi critical flow phải có test trước khi phase được đóng.

---

# 1. DELIVERY MODEL

## 1.1 Phase status

Mỗi phase dùng một trong các trạng thái:

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
READY_FOR_REVIEW
DONE
```

## 1.2 Definition of Done cho từng task

Task chỉ được đánh dấu `DONE` khi:

- Code compile/typecheck.
- Lint pass.
- Validation đầy đủ.
- Error mapping đúng contract.
- Authorization/tenant scope được kiểm tra nếu liên quan.
- Unit/integration test phù hợp pass.
- Không còn TODO trong critical path.
- Logging cần thiết đã có.
- API/OpenAPI docs được cập nhật nếu contract thay đổi.

## 1.3 Critical path

Critical path của toàn dự án:

```text
Repository/Foundation
-> Database
-> Auth
-> Multi-tenancy/RBAC
-> Branch/Service/Staff
-> Scheduling Rules
-> Availability
-> Booking + Concurrency
-> Customer Booking Flow
-> Business Operations
-> Queue + Realtime
-> Mobile
-> QR
-> Payment
-> Notification/Jobs
-> Analytics/Audit/Subscription
-> Hardening
-> CI/CD
-> Deployment
-> Portfolio Demo
```

Không triển khai sâu Payment, Mobile, Analytics hoặc Admin trước khi Booking Core ổn định.

---

# 2. PHASE 0 — PROJECT GOVERNANCE & EXECUTION BASELINE

## Mục tiêu

Khóa quy tắc dự án trước khi code để tránh schema/API/business logic drift.

## Preconditions

- Có `BookFlow_Project_Overview.md`.
- Có Rules/Context Docs `01` → `07`.

## Tasks

### Documentation

- [x] Commit toàn bộ docs vào `docs/`.
- [x] Tạo `docs/rules/`.
- [x] Đặt `BookFlow_Project_Overview.md` ở vị trí cố định.
- [x] Commit:
  - [x] `01_DATABASE_SCHEMA.md`
  - [x] `02_CODING_CONVENTIONS.md`
  - [x] `03_API_SPECIFICATION.md`
  - [x] `04_PROJECT_STRUCTURE.md`
  - [x] `05_STATE_MACHINES_AND_BUSINESS_RULES.md`
  - [x] `06_ROLES_AND_PERMISSIONS.md`
  - [x] `07_ENV_AND_CONFIG.md`
  - [x] `08_IMPLEMENTATION_ROADMAP.md`

### Repository rules

- [x] Chọn package manager: `pnpm`.
- [x] Khóa Node version.
- [x] Enable TypeScript strict.
- [x] Xác định branch strategy.
- [x] Xác định commit convention.
- [x] Xác định PR checklist.
- [x] Thêm `.editorconfig`.
- [x] Thêm `.gitignore`.
- [x] Thêm `.env.example`.
- [x] Không commit secret.

### Tracking

- [x] Tạo issue/milestone tương ứng từng phase.
- [x] Mỗi issue ghi rõ dependency.
- [x] Critical bugs dùng severity.
- [x] Architectural decision quan trọng ghi vào docs.

## Deliverables

```text
.editorconfig
.env.example
.gitignore
.node-version
.nvmrc
CONTRIBUTING.md
package.json
tsconfig.json
.github/
├── PULL_REQUEST_TEMPLATE.md
└── ISSUE_TEMPLATE/
docs/
├── BookFlow_Project_Overview.md
├── README.md
├── adr/
├── project-management/
└── rules/
    ├── 01_DATABASE_SCHEMA.md
    ├── 02_CODING_CONVENTIONS.md
    ├── 03_API_SPECIFICATION.md
    ├── 04_PROJECT_STRUCTURE.md
    ├── 05_STATE_MACHINES_AND_BUSINESS_RULES.md
    ├── 06_ROLES_AND_PERMISSIONS.md
    ├── 07_ENV_AND_CONFIG.md
    └── 08_IMPLEMENTATION_ROADMAP.md
```

## Exit criteria

- Không còn quyết định nền tảng quan trọng chỉ tồn tại trong chat hoặc trí nhớ.
- Team/AI có thể xác định đúng source of truth trước khi sinh code.

---

# 3. PHASE 1 — MONOREPO BOOTSTRAP

## Mục tiêu

Khởi tạo Turborepo và toàn bộ application/package boundaries.

## Tasks

### Root

- [x] Khởi tạo workspace `pnpm`.
- [x] Khởi tạo Turborepo.
- [x] Tạo root `package.json`.
- [x] Tạo `pnpm-workspace.yaml`.
- [x] Tạo `turbo.json`.
- [x] Tạo shared lint config.
- [x] Tạo shared TypeScript config.
- [x] Thêm root scripts:
  - [x] `dev`
  - [x] `build`
  - [x] `lint`
  - [x] `typecheck`
  - [x] `test`
  - [x] `test:unit`
  - [x] `test:integration`
  - [x] `test:e2e`
  - [x] `db:generate`
  - [x] `db:migrate`
  - [x] `db:seed`

### Applications

- [x] `apps/api` — NestJS.
- [x] `apps/worker` — BullMQ worker hoặc bootstrap tách riêng.
- [x] `apps/customer-web` — Next.js.
- [x] `apps/business-web` — Next.js.
- [x] `apps/admin-web` — Next.js.
- [x] `apps/mobile` — Expo + Expo Router.

### Shared packages

- [x] `packages/types`.
- [x] `packages/validation`.
- [x] `packages/api-client`.
- [x] `packages/domain-contracts`.
- [x] `packages/ui`.
- [x] `packages/eslint-config`.
- [x] `packages/tsconfig`.

### Dependency boundaries

- [x] Client packages không import NestJS/Prisma/server-only code.
- [x] `packages/types` không phụ thuộc database runtime.
- [x] `packages/api-client` chỉ chứa network/client contract.
- [x] `packages/ui` không chứa domain/service logic.
- [x] `apps/mobile` không import web-only modules.
- [x] Không tạo package chung chỉ để tránh vài dòng duplicate nếu làm sai boundary.

## Tests

- [x] `pnpm lint`.
- [x] `pnpm typecheck`.
- [x] Build từng app rỗng.
- [x] Turbo task graph hoạt động.

## Exit criteria

- Mọi app chạy được độc lập.
- Import boundary rõ ràng.
- Root commands hoạt động.

---

# 4. PHASE 2 — LOCAL INFRASTRUCTURE & CONFIG FOUNDATION

## Mục tiêu

Có môi trường local tái lập được.

## Tasks

### Docker Compose

- [ ] PostgreSQL.
- [ ] Redis.
- [ ] MinIO hoặc S3-compatible storage.
- [ ] Mailpit optional.
- [ ] Healthcheck cho service.

### Environment

- [ ] Root `.env.example`.
- [ ] Env cho API.
- [ ] Env cho worker.
- [ ] Env cho từng web app.
- [ ] Env cho mobile.
- [ ] Config validation fail-fast ở API/worker.
- [ ] Tách public env và server secret.
- [ ] Không expose JWT/payment/storage secret cho client.

### API foundation

- [ ] Global validation pipe.
- [ ] Global exception filter.
- [ ] Request/correlation ID.
- [ ] Structured logging.
- [ ] CORS allowlist.
- [ ] Security headers.
- [ ] API prefix `/api/v1`.
- [ ] Swagger bootstrap.
- [ ] `/health/live`.
- [ ] `/health/ready`.

## Tests

- [ ] API fail startup khi thiếu required secret.
- [ ] Readiness fail đúng khi DB unavailable.
- [ ] Redis connection test.
- [ ] Object storage local test.

## Exit criteria

Quick start hoạt động:

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

---

# 5. PHASE 3 — DATABASE BASELINE, PRISMA & MIGRATIONS

## Mục tiêu

Khóa schema thực tế theo `01_DATABASE_SCHEMA.md`.

## Tasks

### Prisma

- [ ] Tạo `schema.prisma`.
- [ ] Map table/column theo snake_case.
- [ ] Model/code dùng PascalCase/camelCase.
- [ ] Tạo toàn bộ enum canonical.
- [ ] Tạo relations và foreign keys.
- [ ] Tạo unique constraints.
- [ ] Tạo indexes hot path.

### Core model groups

- [ ] Identity:
  - [ ] users
  - [ ] auth_identities
  - [ ] refresh_tokens
- [ ] Tenant/RBAC:
  - [ ] businesses
  - [ ] business_members
  - [ ] roles
  - [ ] permissions
  - [ ] role_permissions
  - [ ] member_roles
- [ ] Catalog:
  - [ ] branches
  - [ ] branch_opening_hours
  - [ ] service_categories
  - [ ] services
  - [ ] service_branches
  - [ ] staff_profiles
  - [ ] staff_branches
  - [ ] staff_services
- [ ] Scheduling:
  - [ ] staff_working_hours
  - [ ] staff_breaks
  - [ ] staff_leaves
  - [ ] schedule_blocks
- [ ] Customer/Booking:
  - [ ] business_customers
  - [ ] bookings
  - [ ] booking_services
- [ ] Queue:
  - [ ] queue_tickets
  - [ ] queue_sequences
- [ ] Payment:
  - [ ] payments
  - [ ] payment_events
  - [ ] refunds
- [ ] Promotion:
  - [ ] vouchers
  - [ ] voucher_usages
- [ ] Review:
  - [ ] reviews
  - [ ] review_media
- [ ] Notification:
  - [ ] notifications
  - [ ] notification_deliveries
  - [ ] user_devices
- [ ] Files:
  - [ ] media_objects
- [ ] Subscription:
  - [ ] subscription_plans
  - [ ] plan_features
  - [ ] business_subscriptions
- [ ] Audit:
  - [ ] audit_logs

### Data rules

- [ ] Money dùng integer minor units hoặc canonical Decimal strategy.
- [ ] Timestamp lưu UTC/timestamptz semantics.
- [ ] Tenant-scoped tables có `business_id` trực tiếp hoặc ownership path rõ.
- [ ] Không dùng public queue number làm PK.
- [ ] Booking snapshot service/price.
- [ ] Payment provider event id unique.
- [ ] Review booking id unique.

### Migrations

- [ ] Initial migration.
- [ ] Migration naming convention.
- [ ] Không sửa migration đã được deploy.
- [ ] Local reset workflow.
- [ ] Seed development data.

## Tests

- [ ] FK constraints.
- [ ] Unique constraints.
- [ ] Tenant composite uniqueness.
- [ ] Migration up từ database rỗng.
- [ ] Seed thành công.
- [ ] Prisma client generate.

## Exit criteria

- Database có thể rebuild hoàn toàn từ migration + seed.
- Schema code khớp Rules Docs.

---

# 6. PHASE 4 — AUTHENTICATION & SESSION SECURITY

## Mục tiêu

Hoàn thiện identity/session trước khi làm business authorization.

## Tasks

### Register/Login

- [ ] Email/password registration.
- [ ] Normalize email.
- [ ] Password hash Argon2/bcrypt.
- [ ] Login.
- [ ] Rate limit login.
- [ ] Generic invalid credential response.
- [ ] Email verification architecture.
- [ ] Google OAuth optional/recommended.

### Token/session

- [ ] Short-lived access token.
- [ ] Refresh token persistence.
- [ ] Refresh rotation.
- [ ] Refresh family/reuse detection.
- [ ] Token revocation.
- [ ] Logout.
- [ ] Logout all sessions optional.
- [ ] Secure cookie path cho web nếu dùng cookie auth.
- [ ] SecureStore strategy cho mobile.

### Password reset

- [ ] Forgot password.
- [ ] One-time reset token.
- [ ] Expiry.
- [ ] Reset invalidates relevant sessions.

### API

- [ ] `POST /auth/register`
- [ ] `POST /auth/login`
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/logout`
- [ ] `POST /auth/forgot-password`
- [ ] `POST /auth/reset-password`
- [ ] `GET /auth/me`

### Audit/security

- [ ] Login success/failure logging.
- [ ] Refresh reuse event.
- [ ] Không log token/password.

## Tests

- [ ] Valid login.
- [ ] Invalid login.
- [ ] Refresh rotation.
- [ ] Reuse old refresh token.
- [ ] Revoked refresh.
- [ ] Expired access token.
- [ ] Password reset replay protection.

## Exit criteria

- Auth flows stable.
- Không có long-lived token bị lưu insecure ở browser.

---

# 7. PHASE 5 — MULTI-TENANCY, MEMBERSHIP & RBAC

## Mục tiêu

Khóa tenant isolation trước khi tạo business CRUD quy mô lớn.

## Tasks

### Tenant context

- [ ] Resolve current user.
- [ ] Resolve business membership từ authenticated context.
- [ ] Business context object.
- [ ] Không trust arbitrary `business_id` từ mutation body.
- [ ] Repository helper bắt buộc tenant scope.

### Membership

- [ ] Create business owner membership.
- [ ] Invite/create member architecture.
- [ ] Member status.
- [ ] Active/inactive membership.
- [ ] Staff profile và user account tách biệt.

### Permission registry

- [ ] Seed canonical permissions.
- [ ] Default roles.
- [ ] Support custom roles.
- [ ] `@RequirePermission(...)`.
- [ ] Permission Guard.
- [ ] Membership Guard.
- [ ] Tenant scope check.
- [ ] Platform admin path tách riêng.

### Authorization order

```text
Authentication
-> Membership
-> Permission
-> Tenant scope
-> Resource state
-> Mutation
```

### Audit

- [ ] Role assignment.
- [ ] Permission changes.
- [ ] Membership changes.

## Tests

### Mandatory cross-tenant tests

- [ ] Business A cannot read Business B branch.
- [ ] Business A cannot update Business B service.
- [ ] Business A cannot use guessed booking ID from Business B.
- [ ] Cross-tenant nested relation tampering rejected.
- [ ] WebSocket room authorization later phải reuse same tenant model.

## Exit criteria

- Tenant isolation integration tests pass.
- Không có business repository query thiếu scope.

---

# 8. PHASE 6 — BUSINESS ONBOARDING & MASTER DATA

## Mục tiêu

Tạo đầy đủ domain configuration cần trước scheduling.

## 8.1 Business

- [ ] Create business.
- [ ] Name/slug.
- [ ] Business type.
- [ ] Timezone.
- [ ] Currency.
- [ ] Contact.
- [ ] Status.
- [ ] Owner membership.
- [ ] Publish state.

### Publish validation

Business chỉ publish khi có:

- [ ] ≥ 1 active branch.
- [ ] ≥ 1 active service.
- [ ] Staff/service assignment hợp lệ hoặc any-staff policy.
- [ ] Working hours hợp lệ.

## 8.2 Branch

- [ ] CRUD.
- [ ] Branch slug unique trong business.
- [ ] Address.
- [ ] Lat/lng.
- [ ] Optional timezone override.
- [ ] Opening hours.
- [ ] Queue enabled.
- [ ] Booking enabled.
- [ ] Active/archive.

## 8.3 Service

- [ ] Category CRUD.
- [ ] Service CRUD.
- [ ] Duration.
- [ ] Buffer before/after.
- [ ] Price minor units.
- [ ] Deposit configuration.
- [ ] Online booking flag.
- [ ] Walk-in flag.
- [ ] Branch availability mapping.
- [ ] Archive/deactivate thay vì destructive delete.

## 8.4 Staff

- [ ] Staff profile.
- [ ] Optional `user_id`.
- [ ] Staff ↔ branches.
- [ ] Staff ↔ services.
- [ ] Custom duration.
- [ ] Custom price.
- [ ] Roles mapping.
- [ ] Activation/deactivation.

## Tests

- [ ] Cross-tenant CRUD.
- [ ] Slug uniqueness per business.
- [ ] Invalid service/staff mapping rejected.
- [ ] Money validation.
- [ ] Publish validation.

## Exit criteria

Có thể onboard một business đầy đủ tới trạng thái sẵn sàng cấu hình lịch.

---

# 9. PHASE 7 — SCHEDULING RULES

## Mục tiêu

Model hóa lịch trước khi viết availability algorithm.

## Tasks

### Branch opening hours

- [ ] Recurring weekly hours.
- [ ] Closed day.
- [ ] Multiple intervals/day nếu canonical schema hỗ trợ.
- [ ] Branch timezone resolution.

### Staff working hours

- [ ] Recurring weekly schedule.
- [ ] Branch-specific schedule.
- [ ] Validate interval.
- [ ] Prevent invalid overlap nếu rule yêu cầu.

### Breaks

- [ ] Recurring break.
- [ ] One-off break/override nếu model hỗ trợ.
- [ ] Validate break nằm trong meaningful interval.

### Leave

- [ ] Start/end timestamp.
- [ ] Status.
- [ ] Partial day.
- [ ] Multi-day.

### Schedule blocks

- [ ] One-off blocked interval.
- [ ] Reason.
- [ ] Tenant scope.

### Timezone utility

- [ ] UTC persistence.
- [ ] IANA timezone validation.
- [ ] Local date → UTC interval conversion.
- [ ] DST-safe library.
- [ ] Client không tự parse ambiguous timestamp.

## Unit tests

- [ ] Same-day schedule.
- [ ] Closed branch.
- [ ] Split schedule.
- [ ] Break subtraction.
- [ ] Leave overlap.
- [ ] Midnight boundary.
- [ ] DST market test.
- [ ] Branch timezone override.

## Exit criteria

Scheduling primitives có deterministic test coverage trước availability.

---

# 10. PHASE 8 — AVAILABILITY ENGINE

## Mục tiêu

Triển khai module quan trọng nhất của BookFlow.

## Input

```text
business
branch
service
optional staff
target local date
timezone context
```

## Algorithm

### Step 1 — Resolve context

- [ ] Business exists/published.
- [ ] Branch active/booking enabled.
- [ ] Service active/online enabled.
- [ ] Service available ở branch.
- [ ] Staff compatible nếu staff được chọn.
- [ ] Resolve effective timezone.

### Step 2 — Build base intervals

- [ ] Branch opening intervals.
- [ ] Staff working intervals.
- [ ] Intersect branch/staff interval.

### Step 3 — Subtract unavailable time

- [ ] Staff breaks.
- [ ] Leaves.
- [ ] Schedule blocks.
- [ ] Special overrides.

### Step 4 — Existing booking occupation

Occupied tối thiểu:

- [ ] `PENDING_PAYMENT` chưa hết hold.
- [ ] `CONFIRMED`.
- [ ] `CHECKED_IN`.
- [ ] `IN_SERVICE`.

Không occupied:

- [ ] `CANCELLED`.
- [ ] `COMPLETED`.
- [ ] `NO_SHOW`.
- [ ] `EXPIRED`.

### Step 5 — Duration/buffer

- [ ] Service duration.
- [ ] Staff custom duration.
- [ ] Buffer before.
- [ ] Buffer after.
- [ ] Entire resource occupation phải fit.

### Step 6 — Booking policy

- [ ] Minimum lead time.
- [ ] Maximum advance window.
- [ ] Slot interval.

### Step 7 — Generate candidates

- [ ] Generate aligned candidate starts.
- [ ] Reject candidate không đủ full interval.
- [ ] Sort ascending.

### Step 8 — Any staff

- [ ] Query eligible staff.
- [ ] Tính availability per staff.
- [ ] Merge slots.
- [ ] Define staff assignment strategy rõ ràng.
- [ ] Không trả slot nếu lúc write không thể đảm bảo assignment.

### Cache

- [ ] Short TTL.
- [ ] Key chứa tenant + branch + staff + service + date.
- [ ] Mutation schedule/booking invalidate relevant keys.
- [ ] Cache chỉ tối ưu read.
- [ ] Create booking luôn re-check DB trong transaction.

## API

- [ ] `GET /availability`
- [ ] Public/customer-safe response.
- [ ] Không expose internal scheduling data không cần thiết.

## Tests

### Unit

- [ ] Branch hour intersection.
- [ ] Break subtraction.
- [ ] Leave subtraction.
- [ ] Booking overlap.
- [ ] Buffers.
- [ ] Lead time.
- [ ] Advance window.
- [ ] Slot alignment.
- [ ] Any-staff merge.

### Integration

- [ ] Timezone.
- [ ] Real DB booking states.
- [ ] Cache invalidation.

## Exit criteria

Availability engine pass toàn bộ edge-case tests và có deterministic output.

---

# 11. PHASE 9 — BOOKING DOMAIN & CONCURRENCY PROTECTION

## Mục tiêu

Booking create/reschedule/cancel an toàn trước race condition.

## 11.1 State machine

Implement transitions:

```text
PENDING
-> PENDING_PAYMENT
-> CONFIRMED
-> CHECKED_IN
-> IN_SERVICE
-> COMPLETED
```

Additional terminal/exception states:

```text
CANCELLED
NO_SHOW
EXPIRED
```

## 11.2 Booking creation

Flow:

```text
Validate request
-> Resolve business/branch/service/staff
-> Validate policy
-> Calculate server-side price
-> Transaction
-> Acquire lock
-> Re-check conflict
-> Create booking/hold
-> Commit
-> Publish event
-> Enqueue async side effects
```

## 11.3 Concurrency locking

Canonical implementation phải chọn và document một strategy:

### Preferred portfolio strategy

- [ ] PostgreSQL advisory transaction lock theo deterministic resource key.
- [ ] Re-query conflicts trong transaction.
- [ ] Database là final protection.
- [ ] Redis lock không được là lớp duy nhất.

Alternative:

- Serializable transaction với retry policy.

### Mandatory

- [ ] Lock resource + date/staff scope đủ chặt.
- [ ] Hold expiry được tính trong conflict check.
- [ ] Post-commit events chỉ publish sau successful commit.

## 11.4 Price snapshot

- [ ] Service name snapshot.
- [ ] Duration snapshot.
- [ ] Price snapshot.
- [ ] Subtotal.
- [ ] Discount.
- [ ] Deposit.
- [ ] Total.
- [ ] Currency.

## 11.5 Reschedule

- [ ] Không direct update start/end.
- [ ] Lock + re-check availability.
- [ ] Preserve audit/history phù hợp.
- [ ] Invalidate availability cache.

## 11.6 Cancel

- [ ] Validate state.
- [ ] Cancellation window.
- [ ] Refund policy metadata.
- [ ] Cancellation reason.
- [ ] Cancelled booking không re-activate trực tiếp.

## 11.7 Hold expiry

- [ ] `hold_expires_at`.
- [ ] Lazy expiration check.
- [ ] Worker cleanup.
- [ ] Idempotent expiry.

## Tests

### Mandatory concurrency test

- [ ] Gửi nhiều create booking request cùng một staff/slot.
- [ ] Assert chỉ một booking/hold hợp lệ commit.

### State tests

- [ ] Every allowed transition.
- [ ] Every forbidden transition.
- [ ] Reschedule collision.
- [ ] Expired hold no longer occupies.
- [ ] Cancelled booking releases slot.

## Exit criteria

Không thể double-book bằng concurrent requests trong integration test.

---

# 12. PHASE 10 — CUSTOMER WEB CORE

## Mục tiêu

Có end-to-end web booking flow dùng API thật.

## Tasks

### Authentication

- [ ] Register/login/logout.
- [ ] Session bootstrap.
- [ ] Error handling.

### Discovery

- [ ] Business list/search.
- [ ] Business detail.
- [ ] Branch.
- [ ] Services.
- [ ] Staff.
- [ ] Reviews placeholder chỉ khi API thật chưa tới phase review thì không giả dữ liệu.

### Booking flow

```text
Service
-> Branch
-> Staff/Any Staff
-> Date
-> Slot
-> Review
-> Create Booking
```

- [ ] TanStack Query server state.
- [ ] React Hook Form + Zod.
- [ ] API client package.
- [ ] Loading/error/empty states.
- [ ] Conflict handling:
  - [ ] Catch `BOOKING_SLOT_UNAVAILABLE`.
  - [ ] Refresh availability.
  - [ ] User chọn slot khác.

### Booking account

- [ ] Booking list.
- [ ] Booking detail.
- [ ] Reschedule.
- [ ] Cancel.
- [ ] Upcoming booking.

## Tests

- [ ] Playwright search → book.
- [ ] Conflict UX.
- [ ] Auth-protected booking detail.
- [ ] Responsive states.

## Exit criteria

Customer có thể hoàn thành booking từ web, chưa cần payment nếu deposit chưa được bật.

---

# 13. PHASE 11 — BUSINESS WEB OPERATIONS

## Mục tiêu

Business owner/manager vận hành lịch thật.

## Modules

### Dashboard baseline

- [ ] Today bookings.
- [ ] Upcoming bookings.
- [ ] Basic queue placeholders chỉ khi queue module API đã tồn tại; không mock.
- [ ] Revenue widget có thể deferred tới payment/analytics.

### Calendar

- [ ] Day.
- [ ] Week.
- [ ] Month.
- [ ] Staff/resource view.
- [ ] Filters branch/staff/service.
- [ ] Booking detail.
- [ ] Manual booking.
- [ ] Drag/drop reschedule chỉ commit khi backend success.
- [ ] Optimistic rollback trên conflict.

### Bookings

- [ ] List.
- [ ] Filter.
- [ ] Detail.
- [ ] Cancel.
- [ ] Reschedule.
- [ ] No-show.
- [ ] Permission-aware actions.

### Customers

- [ ] Business CRM list.
- [ ] Customer detail.
- [ ] Booking history.
- [ ] Notes/tags theo permission.

### Configuration

- [ ] Branches.
- [ ] Services.
- [ ] Staff.
- [ ] Working schedules.
- [ ] Roles/permissions.
- [ ] Settings.

## Tests

- [ ] Owner permissions.
- [ ] Manager restricted permissions.
- [ ] Staff restricted screens.
- [ ] Cross-tenant URL tampering.
- [ ] Calendar conflict rollback.

## Exit criteria

Business có thể vận hành booking hằng ngày bằng API thật.

---

# 14. PHASE 12 — QUEUE DOMAIN

## Mục tiêu

Hợp nhất appointment check-in và walk-in vào queue branch-scoped.

## Tasks

### Queue ticket

- [ ] Appointment source.
- [ ] Walk-in source.
- [ ] Manual source.
- [ ] Unique active ticket cho booking.
- [ ] Branch scope.
- [ ] Optional preferred staff.
- [ ] Assigned staff.

### Ticket numbering

- [ ] Sequence per branch/business date/prefix.
- [ ] Transaction-safe increment.
- [ ] Reset by business date.
- [ ] Public number không phải PK.

### State machine

```text
WAITING
-> CALLED
-> SERVING
-> COMPLETED
```

Side states:

```text
SKIPPED
CANCELLED
```

### Ordering

- [ ] Priority flag.
- [ ] Scheduled appointment grace rules.
- [ ] joined_at.
- [ ] Không hard-code FIFO duy nhất.

### ETA

MVP deterministic:

```text
sum(estimated durations ahead)
/ eligible serving staff
```

- [ ] UI hiển thị estimate bằng `~`.
- [ ] Không trình bày như cam kết tuyệt đối.

## API

- [ ] Read branch queue.
- [ ] Add walk-in.
- [ ] Call.
- [ ] Start.
- [ ] Complete.
- [ ] Skip.
- [ ] Cancel.

## Tests

- [ ] Ticket sequence concurrency.
- [ ] Duplicate ticket prevention.
- [ ] Invalid queue state.
- [ ] Ordering.
- [ ] ETA.

## Exit criteria

Queue hoạt động đúng ở REST trước khi thêm WebSocket.

---

# 15. PHASE 13 — REALTIME WEBSOCKET

## Mục tiêu

Đồng bộ queue/booking giữa business và customer.

## Tasks

### Gateway

- [ ] Socket.IO NestJS gateway.
- [ ] Authenticate socket.
- [ ] Authorize room join.
- [ ] Tenant-safe room naming.

Rooms:

```text
business:{businessId}
branch:{branchId}
customer:{customerId}
staff:{staffId}
```

### Events

- [ ] `booking.created`
- [ ] `booking.updated`
- [ ] `booking.cancelled`
- [ ] `queue.snapshot`
- [ ] `queue.updated`
- [ ] `queue.ticket.called`
- [ ] `queue.ticket.serving`
- [ ] `queue.ticket.completed`
- [ ] `notification.created`
- [ ] `staff.status.updated`

### Event envelope

- [ ] event name.
- [ ] version.
- [ ] occurredAt.
- [ ] data.

### Reconnect correctness

- [ ] Không giả định event stream đầy đủ.
- [ ] Reconnect trigger snapshot/refetch.
- [ ] TanStack Query invalidate/update.

### Scale path

- [ ] Redis adapter/pub-sub abstraction.
- [ ] Một instance vẫn chạy được.
- [ ] Không lưu canonical queue state chỉ trong Redis.

## Tests

- [ ] Unauthorized room join rejected.
- [ ] Business A không nhận event B.
- [ ] Customer chỉ nhận event được phép.
- [ ] Reconnect → snapshot refresh.
- [ ] Multiple clients same branch.

## Exit criteria

Realtime là enhancement trên state DB, không làm thay đổi source-of-truth model.

---

# 16. PHASE 14 — CUSTOMER MOBILE

## Mục tiêu

React Native client dùng cùng API/business rules.

## Tasks

### Foundation

- [ ] Expo.
- [ ] Expo Router.
- [ ] API client.
- [ ] TanStack Query.
- [ ] Zustand UI/session state nếu cần.
- [ ] SecureStore.
- [ ] Error boundary.
- [ ] Deep linking foundation.

### Navigation

```text
Home
Explore
Bookings
Notifications
Profile
```

### Auth

- [ ] Login.
- [ ] Register.
- [ ] Refresh session.
- [ ] Secure token persistence.

### Discovery

- [ ] Search.
- [ ] Nearby businesses.
- [ ] Business detail.
- [ ] Service/staff/branch.

### Booking

- [ ] Availability.
- [ ] Booking create.
- [ ] Conflict recovery.
- [ ] Booking detail.
- [ ] Cancel/reschedule.

### Realtime queue

- [ ] Connect socket.
- [ ] Active ticket.
- [ ] People ahead.
- [ ] ETA.
- [ ] Reconnect refetch.

### Native capabilities foundation

- [ ] Location permission.
- [ ] Camera permission.
- [ ] Push token registration.

## Tests

- [ ] React Native Testing Library.
- [ ] Android development build smoke.
- [ ] Session restore.
- [ ] Booking flow.
- [ ] Realtime queue smoke.

## Exit criteria

Android/Expo development build có auth/search/booking/queue flow thật.

---

# 17. PHASE 15 — SIGNED QR CHECK-IN

## Mục tiêu

Check-in an toàn, không dùng plain booking ID.

## Tasks

### QR generation

- [ ] Dedicated signing secret.
- [ ] Token claims:
  - [ ] type.
  - [ ] bookingId.
  - [ ] customerId.
  - [ ] expiry.
  - [ ] nonce.
- [ ] Short enough for QR.
- [ ] No sensitive unnecessary data.

### Validation

- [ ] Signature.
- [ ] Expiry.
- [ ] Booking exists.
- [ ] Customer/scanner authorization.
- [ ] Booking state.
- [ ] Early/late check-in window.
- [ ] Duplicate queue ticket prevention.

### Surfaces

- [ ] Customer web display.
- [ ] Mobile display.
- [ ] Business scanner.
- [ ] Camera scan.

### Idempotency

- [ ] Re-scan không tạo duplicate ticket.
- [ ] Stable response cho already checked-in case.

## Tests

- [ ] Forged token.
- [ ] Expired token.
- [ ] Wrong customer.
- [ ] Wrong state.
- [ ] Duplicate scan.
- [ ] Cross-tenant scan.

## Exit criteria

QR check-in end-to-end tạo queue ticket đúng một lần.

---

# 18. PHASE 16 — PAYMENT & DEPOSIT

## Mục tiêu

Payment sandbox production-oriented với webhook là source of truth.

## Tasks

### Provider abstraction

- [ ] `createPayment`.
- [ ] `verifyWebhook`.
- [ ] `refund`.
- [ ] Stripe adapter trước.
- [ ] VNPay/MoMo chỉ thêm qua adapter nếu cần.

### Payment intent

- [ ] Calculate amount server-side.
- [ ] Không trust amount từ client.
- [ ] Deposit rules.
- [ ] Booking hold.
- [ ] Provider metadata chứa stable internal identifiers.

### Webhook

- [ ] Raw body.
- [ ] Verify signature.
- [ ] Persist `provider_event_id`.
- [ ] Unique constraint.
- [ ] Idempotent processing.
- [ ] State transition.
- [ ] Return safe provider response.

### Booking integration

- [ ] Deposit required → `PENDING_PAYMENT`.
- [ ] Success → `CONFIRMED`.
- [ ] Expired hold → `EXPIRED`.
- [ ] Client success redirect không mark `PAID`.

### Refund

- [ ] Permission.
- [ ] Cancellation policy.
- [ ] Partial/full refund.
- [ ] Audit log.
- [ ] Idempotent provider handling.

## Tests

- [ ] Valid webhook.
- [ ] Invalid signature.
- [ ] Duplicate webhook.
- [ ] Out-of-order event handling policy.
- [ ] Retry.
- [ ] Amount mismatch protection.
- [ ] Refund permission.

## Exit criteria

Duplicate provider webhook không tạo duplicate financial/domain side effects.

---

# 19. PHASE 17 — VOUCHERS & PROMOTIONS

## Mục tiêu

Pricing/promotion concurrency-safe.

## Tasks

### Validation order

1. [ ] Exists/active.
2. [ ] Time window.
3. [ ] Business scope.
4. [ ] Branch applicability.
5. [ ] Service applicability.
6. [ ] Minimum amount.
7. [ ] Global usage limit.
8. [ ] Per-customer usage limit.
9. [ ] Discount cap.
10. [ ] Final server-side total.

### Concurrency

- [ ] Voucher usage write trong transaction phù hợp booking lifecycle.
- [ ] Chống oversubscription usage limit.
- [ ] Rollback usage nếu booking transaction fail.

### Snapshot

- [ ] Discount amount snapshot.
- [ ] Code/reference phù hợp cho lịch sử.

## Tests

- [ ] Expired.
- [ ] Wrong branch.
- [ ] Wrong service.
- [ ] Usage limits.
- [ ] Concurrent last voucher usage.
- [ ] Fixed/percent caps.

## Exit criteria

Không thể vượt usage limit bằng concurrent requests.

---

# 20. PHASE 18 — NOTIFICATIONS & BACKGROUND JOBS

## Mục tiêu

Tách side effects khỏi request path.

## Tasks

### BullMQ foundation

Queues:

- [ ] notifications.
- [ ] booking-reminders.
- [ ] payments.
- [ ] analytics.
- [ ] cleanup.
- [ ] email.

### Jobs

- [ ] Booking confirmation.
- [ ] Reminder 24h.
- [ ] Reminder 1h.
- [ ] Hold expiry.
- [ ] Review request.
- [ ] Push/email retry.
- [ ] Payment reconciliation.
- [ ] Daily analytics.
- [ ] Token cleanup.

### Job rules

- [ ] Deterministic `jobId`/idempotency key.
- [ ] Retryable vs permanent errors.
- [ ] Exponential backoff khi phù hợp.
- [ ] Delivery attempt record.
- [ ] Correlation ID propagation.

### Notifications

Channels:

- [ ] IN_APP.
- [ ] PUSH.
- [ ] EMAIL.
- [ ] SMS optional.

### Mobile push

- [ ] Device registration.
- [ ] Expo push token.
- [ ] Disable invalid token.
- [ ] Deep link payload.

## Tests

- [ ] Same job retried không duplicate side effect.
- [ ] Failed provider recorded.
- [ ] Invalid push token disabled.
- [ ] Reminder scheduling correct timezone.
- [ ] Cancelled booking reminder cancelled/skipped.

## Exit criteria

API mutation không chờ email/push provider.

---

# 21. PHASE 19 — REVIEWS & CUSTOMER CRM COMPLETION

## Reviews

- [ ] Chỉ `COMPLETED` booking được review.
- [ ] One review per booking.
- [ ] Overall rating 1..5.
- [ ] Optional staff/service/waiting rating.
- [ ] Comment.
- [ ] Media.
- [ ] Moderation status.
- [ ] Business reply architecture nếu triển khai.
- [ ] Business không sửa customer content.

## Customer CRM

- [ ] Global user vs business customer separation.
- [ ] Guest/walk-in customer.
- [ ] Total bookings aggregate.
- [ ] Total spent aggregate.
- [ ] No-show count.
- [ ] Last visit.
- [ ] Notes/tags permission.
- [ ] Tenant isolation.

## Tests

- [ ] Review before completion rejected.
- [ ] Duplicate review rejected.
- [ ] Cross-tenant CRM rejected.

## Exit criteria

Post-service engagement flow hoàn chỉnh.

---

# 22. PHASE 20 — SEARCH, LOCATION & MEDIA

## Search

- [ ] Business name search.
- [ ] Service search.
- [ ] Category search.
- [ ] Location text.
- [ ] PostgreSQL trigram/full-text.
- [ ] Search indexes.
- [ ] Pagination.

## Location

- [ ] Branch lat/lng.
- [ ] Nearby query.
- [ ] PostGIS nếu triển khai radius tốt.
- [ ] Rating filter.
- [ ] Price filter.
- [ ] Category.
- [ ] Available today.
- [ ] Open now tính theo branch timezone.

## Media

- [ ] Presigned upload URL.
- [ ] Mime validation.
- [ ] Size validation.
- [ ] Random object key.
- [ ] Tenant namespace.
- [ ] Confirm metadata.
- [ ] Signed read URL cho private objects.

Objects:

- [ ] Business logo/banner.
- [ ] Branch gallery.
- [ ] Service image.
- [ ] Staff avatar.
- [ ] Review media.

## Tests

- [ ] Cross-tenant object namespace.
- [ ] Invalid MIME.
- [ ] Oversize upload.
- [ ] Open-now timezone correctness.

## Exit criteria

Discovery experience hoàn chỉnh mà không lưu binary trong PostgreSQL.

---

# 23. PHASE 21 — ANALYTICS

## Mục tiêu

Dashboard business với dữ liệu thật.

## KPIs

- [ ] Revenue.
- [ ] Booking count.
- [ ] Completion rate.
- [ ] Cancellation rate.
- [ ] No-show rate.
- [ ] Average order value.
- [ ] New vs returning customers.
- [ ] Top services.
- [ ] Top staff.
- [ ] Peak hours.
- [ ] Branch performance.
- [ ] Average waiting time.

## Filters

- [ ] Date range.
- [ ] Branch.
- [ ] Staff.
- [ ] Service.

## Data strategy

Stage 1:

- [ ] Indexed PostgreSQL aggregate queries.

Stage 2 nếu cần:

- [ ] `business_daily_metrics`.
- [ ] `branch_daily_metrics`.
- [ ] `staff_daily_metrics`.
- [ ] `service_daily_metrics`.

## Performance

- [ ] No N+1.
- [ ] Query plan hot queries.
- [ ] Cache only when justified.

## Tests

- [ ] Revenue excludes invalid states according canonical rules.
- [ ] Timezone day boundaries.
- [ ] Tenant filtering.
- [ ] Date range.

## Exit criteria

Dashboard KPI có thể đối chiếu với transactional data.

---

# 24. PHASE 22 — AUDIT LOGGING & SECURITY HARDENING

## Audit actions

- [ ] Role/permission change.
- [ ] Staff creation/deactivation.
- [ ] Service price change.
- [ ] Business booking cancellation.
- [ ] Refund.
- [ ] Subscription change.
- [ ] Business suspend.

Store:

- [ ] actor.
- [ ] action.
- [ ] resource.
- [ ] before/after.
- [ ] IP.
- [ ] user agent.
- [ ] timestamp.
- [ ] tenant where applicable.

## Security hardening

- [ ] Login/reset rate limits.
- [ ] CORS.
- [ ] CSRF nếu cookie strategy cần.
- [ ] XSS-safe rendering.
- [ ] Upload validation.
- [ ] Secure cookies.
- [ ] Secret rotation strategy.
- [ ] No credentials in logs.
- [ ] Dependency vulnerability review.
- [ ] Authorization negative tests.
- [ ] Mass-assignment review.

## Exit criteria

Sensitive mutation traceable và security checklist pass.

---

# 25. PHASE 23 — SUBSCRIPTIONS & FEATURE GATING

## Mục tiêu

SaaS limits enforce server-side.

## Tasks

### Plans

- [ ] Free.
- [ ] Pro.
- [ ] Business.

### Limits/features

- [ ] Branch count.
- [ ] Staff count.
- [ ] Monthly booking count.
- [ ] Analytics level.
- [ ] Custom roles.
- [ ] API access.

### Enforcement

- [ ] `@RequireFeature(...)`.
- [ ] Server-side limit checks.
- [ ] UI hide/disable chỉ UX.
- [ ] Subscription status.
- [ ] Current period.
- [ ] Feature cache/invalidation nếu dùng.

## Tests

- [ ] Free plan branch limit.
- [ ] Staff limit.
- [ ] Custom role access.
- [ ] Expired/inactive subscription behavior.

## Exit criteria

Client bypass không vượt feature/plan limit.

---

# 26. PHASE 24 — ADMIN WEB

## Mục tiêu

Platform administration cơ bản.

## Modules

- [ ] Platform overview.
- [ ] Businesses.
- [ ] Users.
- [ ] Subscriptions.
- [ ] System transactions.
- [ ] Reports.
- [ ] Feature flags.
- [ ] Audit logs.
- [ ] Suspend/restore business.

## Security

- [ ] Platform admin auth path rõ.
- [ ] Không dùng tenant membership như platform admin permission.
- [ ] Sensitive action audit.
- [ ] Confirmation UX cho destructive/suspend action.

## Exit criteria

Admin có platform visibility mà không phá tenant authorization model.

---

# 27. PHASE 25 — OBSERVABILITY

## Logging

Structured JSON:

- [ ] level.
- [ ] event.
- [ ] requestId.
- [ ] businessId nếu phù hợp.
- [ ] resource IDs.
- [ ] durationMs.
- [ ] error code.

## Correlation

- [ ] Request → domain event.
- [ ] Request → job.
- [ ] Job retry.
- [ ] Payment webhook.

## Error monitoring

- [ ] Sentry backend.
- [ ] Sentry web.
- [ ] Mobile crash/error setup.

## Health

- [ ] Liveness.
- [ ] Readiness.
- [ ] Dependency checks ở mức hợp lý.

## Optional metrics

- [ ] Request latency.
- [ ] Booking conflict count.
- [ ] Payment webhook failures.
- [ ] Queue size.
- [ ] Job failures.

## Exit criteria

Có thể trace lỗi booking/payment/job từ request ID.

---

# 28. PHASE 26 — COMPREHENSIVE TESTING

## 28.1 Unit

Ưu tiên:

- [ ] Availability intervals.
- [ ] Pricing.
- [ ] Deposit.
- [ ] Voucher.
- [ ] State transitions.
- [ ] Queue ordering.
- [ ] Permission rules.
- [ ] Timezone utility.
- [ ] Money helpers.

## 28.2 Integration

- [ ] Booking concurrency.
- [ ] Tenant isolation.
- [ ] DB constraints.
- [ ] Payment idempotency.
- [ ] Notification enqueue.
- [ ] QR idempotency.
- [ ] Queue sequence concurrency.
- [ ] Voucher usage concurrency.

## 28.3 E2E web

- [ ] Business onboarding.
- [ ] Configure branch/service/staff.
- [ ] Customer search.
- [ ] Availability.
- [ ] Booking.
- [ ] Business sees booking.
- [ ] QR check-in.
- [ ] Queue realtime.
- [ ] Start/complete service.
- [ ] Review.
- [ ] Payment sandbox.

## 28.4 Mobile smoke

- [ ] Auth.
- [ ] Search.
- [ ] Book.
- [ ] Booking detail.
- [ ] QR.
- [ ] Realtime queue.
- [ ] Push/deep link.

## 28.5 Performance tests

Hot paths:

- [ ] Availability.
- [ ] Booking list.
- [ ] Customer history.
- [ ] Active queue.
- [ ] Notifications.
- [ ] Search.
- [ ] Voucher lookup.
- [ ] Payment provider ID lookup.

## Exit criteria

Không deploy public demo nếu critical integration/E2E flows fail.

---

# 29. PHASE 27 — CI/CD

## Pull Request pipeline

```text
Install
-> lint
-> typecheck
-> unit tests
-> integration tests
-> build affected apps
```

## Main pipeline

```text
CI passed
-> migration review/apply strategy
-> deploy API
-> deploy web apps
-> smoke health check
```

## Tasks

- [ ] GitHub Actions cache.
- [ ] Turbo affected build.
- [ ] Test DB service.
- [ ] Secret injection.
- [ ] Migration command.
- [ ] Không auto-run destructive migration.
- [ ] Deployment environment separation.
- [ ] Production smoke test.

## Exit criteria

Broken type/test/build không thể merge/deploy.

---

# 30. PHASE 28 — DEPLOYMENT

## Portfolio mapping

- [ ] Customer Web → Vercel.
- [ ] Business Web → Vercel.
- [ ] Admin Web → Vercel.
- [ ] API → Render hoặc equivalent.
- [ ] PostgreSQL → Supabase.
- [ ] Redis → Upstash.
- [ ] Object storage → Cloudflare R2.
- [ ] Mobile build → Expo EAS.
- [ ] Git/CI → GitHub.

## Deployment tasks

### Database

- [ ] Production DB.
- [ ] DIRECT database URL cho migration nếu cần.
- [ ] Migration.
- [ ] Seed demo data chỉ ở demo env.

### Redis

- [ ] TLS connection.
- [ ] BullMQ compatibility.
- [ ] Socket adapter compatibility.

### Object storage

- [ ] Bucket.
- [ ] CORS.
- [ ] Signed URL config.
- [ ] Public/private object policy.

### API

- [ ] Production env validation.
- [ ] CORS exact origins.
- [ ] Payment webhook URL.
- [ ] Health endpoints.
- [ ] Cold-start caveat documented.

### Web

- [ ] API base URL.
- [ ] Auth cookie/domain.
- [ ] Error monitoring.
- [ ] Public env only.

### Mobile

- [ ] Production API URL.
- [ ] Push credentials.
- [ ] Deep linking.
- [ ] Android build.

## Exit criteria

Demo environment có thể chạy end-to-end từ external client.

---

# 31. PHASE 29 — DEMO DATA & RECRUITER FLOW

## Seed business

```text
Gentleman Barber
Ho Chi Minh City
Branches: District 1, Thu Duc
Services: Haircut, Hair + Wash, Hair + Beard
Staff: Minh, Nam, An
```

## Demo accounts

- [ ] Customer.
- [ ] Owner.
- [ ] Manager.

Không reuse production secrets/password policy.

## Demo script

1. [ ] Customer mở web/mobile.
2. [ ] Search Gentleman Barber.
3. [ ] Chọn Haircut.
4. [ ] Chọn Minh.
5. [ ] Chọn slot.
6. [ ] Sandbox deposit/payment.
7. [ ] Business web nhận booking.
8. [ ] Customer mở QR.
9. [ ] Business scan/check-in.
10. [ ] Queue realtime update.
11. [ ] Business call/start service.
12. [ ] Business complete service.
13. [ ] Customer nhận review request.
14. [ ] Customer review.
15. [ ] Dashboard metrics cập nhật.

## Exit criteria

Một recruiter có thể hiểu giá trị kỹ thuật của project trong một demo liền mạch.

---

# 32. PHASE 30 — README, DOCUMENTATION & PORTFOLIO POLISH

## README

- [ ] Project summary.
- [ ] Architecture diagram.
- [ ] Tech stack.
- [ ] Screenshots/GIF.
- [ ] Live URLs.
- [ ] Android APK/Expo link.
- [ ] Local setup.
- [ ] Environment setup.
- [ ] Demo credentials.
- [ ] Technical challenges.
- [ ] Testing commands.
- [ ] Deployment notes.

## Technical write-ups

Viết ngắn nhưng đủ sâu cho:

- [ ] Prevent double booking.
- [ ] Availability algorithm.
- [ ] Tenant isolation.
- [ ] WebSocket reconnect reconciliation.
- [ ] Payment webhook idempotency.
- [ ] Reminder scheduling.
- [ ] Signed QR.
- [ ] Timezone.
- [ ] Money handling.

## Screenshots

- [ ] Customer discovery.
- [ ] Booking flow.
- [ ] Business calendar.
- [ ] Queue realtime.
- [ ] Mobile QR.
- [ ] Analytics.
- [ ] Architecture diagram.

## CV

Project title:

```text
BookFlow — Multi-tenant Booking & Realtime Queue Platform
```

## Exit criteria

Repository không còn boilerplate README và recruiter có thể chạy demo theo hướng dẫn.

---

# 33. FINAL PROJECT COMPLETION GATE

Project chỉ được coi là hoàn thiện khi tất cả mục sau đạt:

## Customer Web

- [ ] Search/discover.
- [ ] Business detail.
- [ ] Availability.
- [ ] Booking.
- [ ] Booking detail.
- [ ] Reschedule/cancel.
- [ ] Payment.
- [ ] QR.
- [ ] Queue.

## Business Web

- [ ] Dashboard.
- [ ] Calendar.
- [ ] Bookings.
- [ ] Queue.
- [ ] Customers.
- [ ] Services.
- [ ] Staff.
- [ ] Branches.
- [ ] Promotions.
- [ ] Reviews.
- [ ] Payments.
- [ ] Analytics.
- [ ] Roles.
- [ ] Settings.

## Mobile

- [ ] Auth.
- [ ] Search.
- [ ] Booking.
- [ ] QR.
- [ ] Realtime queue.
- [ ] Push.
- [ ] Deep link.

## Admin

- [ ] Business overview.
- [ ] User overview.
- [ ] Subscription overview.
- [ ] Platform controls cơ bản.

## Backend

- [ ] Auth.
- [ ] RBAC.
- [ ] Multi-tenancy.
- [ ] Scheduling.
- [ ] Availability.
- [ ] Booking concurrency.
- [ ] Queue.
- [ ] Realtime.
- [ ] QR.
- [ ] Payments.
- [ ] Voucher.
- [ ] Reviews.
- [ ] Notifications.
- [ ] Analytics.
- [ ] Audit.
- [ ] Subscription gating.
- [ ] OpenAPI.

## Engineering

- [ ] Migrations.
- [ ] Seed.
- [ ] Redis usage thật.
- [ ] BullMQ usage thật.
- [ ] Automated tests.
- [ ] Docker local.
- [ ] CI.
- [ ] Deployment.
- [ ] Observability.
- [ ] README/demo.

---

# 34. RECOMMENDED EXECUTION ORDER BY SPRINT

Đây là cách nhóm phase nếu muốn quản lý theo sprint. Sprint không thay đổi dependency kỹ thuật.

## Sprint 1 — Foundation

- Phase 0.
- Phase 1.
- Phase 2.
- Phase 3.

**Output:** Monorepo + infrastructure + DB chạy được.

## Sprint 2 — Identity & Tenant

- Phase 4.
- Phase 5.

**Output:** Auth + tenant isolation + RBAC.

## Sprint 3 — Business Configuration

- Phase 6.
- Phase 7.

**Output:** Business/branch/service/staff/schedule.

## Sprint 4 — Scheduling Core

- Phase 8.
- Phase 9.

**Output:** Availability + concurrency-safe booking.

## Sprint 5 — Web Booking

- Phase 10.
- Phase 11.

**Output:** Customer Web + Business Web core.

## Sprint 6 — Operations Realtime

- Phase 12.
- Phase 13.

**Output:** Queue + realtime.

## Sprint 7 — Mobile & Check-in

- Phase 14.
- Phase 15.

**Output:** Mobile booking + QR/realtime queue.

## Sprint 8 — Financial

- Phase 16.
- Phase 17.

**Output:** Payment + deposit + voucher.

## Sprint 9 — Engagement

- Phase 18.
- Phase 19.
- Phase 20.

**Output:** Notifications + reviews + CRM + search/media/location.

## Sprint 10 — SaaS Operations

- Phase 21.
- Phase 22.
- Phase 23.
- Phase 24.

**Output:** Analytics + audit + subscription + admin.

## Sprint 11 — Production Hardening

- Phase 25.
- Phase 26.
- Phase 27.

**Output:** Observability + comprehensive tests + CI/CD.

## Sprint 12 — Release & Portfolio

- Phase 28.
- Phase 29.
- Phase 30.

**Output:** Live demo + Android build + recruiter-ready portfolio.

---

# 35. TASK PRIORITY RULES

Khi phải chọn việc nào làm trước:

## P0 — Correctness/Security

- Tenant leak.
- Double booking.
- Wrong payment state.
- Webhook signature/idempotency.
- Authorization bypass.
- Money calculation.
- Timezone corruption.
- Data loss.

## P1 — Core user flow

- Cannot book.
- Cannot manage booking.
- Queue state incorrect.
- Check-in broken.
- Login/session broken.

## P2 — Operational usability

- Dashboard.
- Search.
- Filters.
- Notification.
- Analytics.

## P3 — Polish

- Animation.
- Non-critical visual refinement.
- Optional providers.
- Advanced metrics.

Không xử lý P3 nếu P0/P1 chưa ổn định.

---

# 36. ARCHITECTURE REVIEW CHECKPOINTS

Phải review architecture ở các mốc sau:

## Checkpoint A — Sau Phase 5

Review:

- Schema.
- Auth.
- Tenant context.
- RBAC.
- Import boundaries.

## Checkpoint B — Sau Phase 9

Review:

- Availability correctness.
- Booking transaction.
- Lock strategy.
- State machine.
- Money/timezone.

## Checkpoint C — Sau Phase 13

Review:

- Queue correctness.
- Realtime authorization.
- Event contract.
- Reconnect strategy.

## Checkpoint D — Sau Phase 18

Review:

- Payment idempotency.
- Job idempotency.
- Notification retry.
- Side-effect boundaries.

## Checkpoint E — Trước deployment

Review:

- Secrets.
- CORS.
- Database migrations.
- Tenant security.
- Rate limits.
- Payment webhook.
- Observability.
- E2E tests.

---

# 37. THINGS THAT MUST NEVER BE USED AS SHORTCUTS

Không được đóng phase bằng các shortcut sau:

- Frontend check availability thay cho database concurrency protection.
- `business_id` lấy trực tiếp từ body rồi tin tưởng.
- Payment success redirect thay webhook.
- Redis lock là lớp bảo vệ duy nhất cho booking.
- WebSocket state là source of truth.
- Client tự tính số tiền thanh toán.
- JS floating point cho financial calculation.
- Plain booking ID trong QR.
- Hard-coded role checks rải rác trong controller.
- API call trực tiếp trong React component.
- Fake/mock API cho demo critical path.
- Update `start_at` trực tiếp khi reschedule.
- Hard delete booking/payment/audit history.
- Parse error message string thay error code.
- Silent timezone conversion.
- Shared package import server-only code vào client.

---

# 38. RELEASE CHECKLIST

Trước public release:

## Correctness

- [ ] Concurrency test pass.
- [ ] Tenant isolation test pass.
- [ ] Payment duplicate webhook test pass.
- [ ] QR forged token test pass.
- [ ] Queue duplicate ticket test pass.
- [ ] Voucher concurrency test pass.

## Security

- [ ] Secrets scan.
- [ ] CORS.
- [ ] Rate limit.
- [ ] Upload validation.
- [ ] Auth cookie/token review.
- [ ] Admin authorization.
- [ ] Audit logging.

## Data

- [ ] Production migration reviewed.
- [ ] Backup/recovery assumptions documented.
- [ ] Demo seed safe.
- [ ] No sample production passwords.

## UX

- [ ] Loading states.
- [ ] Empty states.
- [ ] Error states.
- [ ] Mobile responsive.
- [ ] Accessibility basics.
- [ ] Conflict recovery.

## Operations

- [ ] Health endpoints.
- [ ] Sentry.
- [ ] Structured logs.
- [ ] Request IDs.
- [ ] Job failure visibility.

## Portfolio

- [ ] Screenshots.
- [ ] Architecture diagram.
- [ ] README.
- [ ] Demo script.
- [ ] Live URLs.
- [ ] Android demo/build.

---

# 39. END STATE

Khi toàn bộ roadmap hoàn thành, BookFlow phải chứng minh được các năng lực sau bằng code chạy thật:

```text
Multi-tenant SaaS isolation
+ RBAC
+ Scheduling engine
+ Database concurrency control
+ Realtime queue
+ React Native mobile client
+ Secure QR check-in
+ Payment webhook idempotency
+ Background jobs
+ Notifications
+ Analytics
+ Production-oriented testing
+ CI/CD
+ Observability
+ Deployment
```

Điểm quan trọng nhất: BookFlow phải được nhìn nhận như một hệ thống booking/realtime SaaS có tính đúng đắn về transaction, security và consistency, không phải một CRUD application có thêm calendar UI.
