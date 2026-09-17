# BookFlow — Database Schema Standard

**Status:** Canonical Rules/Context Document  
**Source:** `BookFlow_Project_Overview.md` v1.0 — 17/09/2026  
**Scope:** PostgreSQL + Prisma data model, naming, tenant ownership, relationships, constraints, indexes and migration rules.

> This document turns the project overview into an exact implementation contract. When this document makes a normalization decision for an ambiguity in the overview, the decision is called out explicitly below. Any future schema change must update this document and add a new migration.

## 1. Non-negotiable data rules

1. PostgreSQL is the transactional source of truth for booking/payment state. Redis is never the only persistence layer for those states.
2. Database identifiers use `snake_case`; TypeScript/Prisma/DTO identifiers use `camelCase`; classes/types/enums use `PascalCase`.
3. All persisted timestamps representing an instant use UTC `timestamptz`.
4. Local working-hour rules use local wall-clock `time` plus an IANA timezone resolved from branch/business settings.
5. Money uses integer minor units (`*_minor`) and a three-letter currency code. Never persist monetary values as floating point.
6. Tenant-owned root rows carry `business_id`. Pure child/join rows may derive tenant ownership only when the relation path to a single business is unambiguous.
7. Historical/financial rows are not hard-deleted casually. Service/staff/branch use status/deactivation; bookings/payments/audit records are retained.
8. Schema changes require a new migration. Never rewrite a migration that has already been applied outside local disposable development.

## 2. Canonical normalization decisions

The overview contains a few intentionally high-level or inconsistent names. For this ruleset, use these canonical forms:

| Topic | Canonical rule |
|---|---|
| Deposit enum | `NONE`, `FIXED_AMOUNT`, `PERCENTAGE` |
| Voucher percent storage | Integer basis points in `value` (`2000` = 20.00%); fixed voucher `value` is minor units |
| Booking services | Use `booking_services` as the canonical service snapshot relation; do not add a mutable `bookings.service_id` shortcut |
| Queue daily numbering | Add `queue_tickets.business_date` so daily ticket uniqueness can be enforced |
| Business management route naming impact | DB table remains `businesses`; API route conventions are defined in `03_API_SPECIFICATION.md` |
| Unspecified status vocabularies | Keep as `String` until a dedicated state catalog is approved; do not invent hidden enum values |
| Staff authorization roles | Roles attach to `business_members`; `staff_roles` is conceptual, not a second authorization graph |

## 3. Tenant ownership matrix

### 3.1 `business_id` REQUIRED directly

These tables are tenant roots or high-risk tenant-scoped records and must contain `business_id` directly:

- `branches`
- `service_categories`
- `services`
- `staff_profiles`
- `schedule_blocks`
- `business_customers`
- `bookings`
- `queue_tickets`
- `payments`
- `payment_configurations`
- `vouchers`
- `reviews`
- tenant-owned `roles` (`business_id` nullable only for system role templates)
- `audit_logs` (`business_id` nullable only for platform-level audit events)
- `notifications` when the notification is business-scoped
- `media_objects` when the asset is business-scoped

### 3.2 Tenant ownership may be derived through a mandatory parent

The following tables do not require a redundant `business_id` when every query is scoped through their parent relation:

- `branch_opening_hours` -> `branches`
- `service_branches` -> `services` + `branches`
- `staff_branches` -> `staff_profiles` + `branches`
- `staff_services` -> `staff_profiles` + `services`
- `staff_working_hours` -> `staff_profiles`
- `staff_breaks` -> `staff_profiles`
- `staff_leaves` -> `staff_profiles`
- `booking_services` -> `bookings`
- `queue_sequences` -> `branches`
- `refunds` -> `payments`
- `voucher_usages` -> `vouchers` + `bookings`
- `voucher_branches` -> `vouchers` + `branches`
- `voucher_services` -> `vouchers` + `services`
- `review_media` -> `reviews`
- `notification_deliveries` -> `notifications`
- `role_permissions` -> `roles`
- `member_roles` -> `business_members`
- `plan_features` -> `subscription_plans`
- `business_subscriptions` already has `business_id` because it is a tenant-level root relation

**Rule:** An application query must never rely on a client-provided `business_id`. Resolve tenant scope from authenticated membership/session context and include it in repository filters.

## 4. Canonical Prisma schema

The following schema is the canonical baseline. It intentionally leaves generic status fields as `String` where the overview did not define a complete state vocabulary.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum DepositType {
  NONE
  FIXED_AMOUNT
  PERCENTAGE
}

enum BookingStatus {
  PENDING
  PENDING_PAYMENT
  CONFIRMED
  CHECKED_IN
  IN_SERVICE
  COMPLETED
  CANCELLED
  NO_SHOW
  EXPIRED
}

enum BookingSource {
  WEB
  MOBILE
  BUSINESS_WEB
  WALK_IN
}

enum QueueTicketStatus {
  WAITING
  CALLED
  SERVING
  COMPLETED
  SKIPPED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  PROCESSING
  PAID
  FAILED
  CANCELLED
  PARTIALLY_REFUNDED
  REFUNDED
}

enum PaymentType {
  DEPOSIT
  FULL_PAYMENT
  REFUND
}

enum RefundStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELLED
}

enum VoucherType {
  PERCENT
  FIXED
}

enum NotificationChannel {
  IN_APP
  PUSH
  EMAIL
  SMS
}

enum NotificationDeliveryStatus {
  PENDING
  PROCESSING
  DELIVERED
  FAILED
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model User {
  id              String         @id @default(uuid()) @db.Uuid
  email           String         @unique
  passwordHash    String?        @map("password_hash")
  fullName        String         @map("full_name")
  phone           String?
  avatarUrl       String?        @map("avatar_url")
  status          String
  emailVerifiedAt DateTime?      @map("email_verified_at") @db.Timestamptz(6)
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)

  authIdentities     AuthIdentity[]
  refreshTokens      RefreshToken[]
  ownedBusinesses    Business[]         @relation("BusinessOwner")
  memberships        BusinessMember[]
  staffProfiles      StaffProfile[]
  businessCustomers  BusinessCustomer[]
  notifications      Notification[]
  devices            UserDevice[]
  auditLogs           AuditLog[]

  @@map("users")
}

model AuthIdentity {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  provider       String
  providerUserId String   @map("provider_user_id")
  metadata       Json?
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerUserId], map: "auth_identities_provider_provider_user_id_key")
  @@index([userId])
  @@map("auth_identities")
}

model RefreshToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @map("token_hash")
  familyId  String    @map("family_id") @db.Uuid
  expiresAt DateTime  @map("expires_at") @db.Timestamptz(6)
  revokedAt DateTime? @map("revoked_at") @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, familyId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

model Business {
  id                 String                 @id @default(uuid()) @db.Uuid
  ownerUserId        String                 @map("owner_user_id") @db.Uuid
  name               String
  slug               String                 @unique
  type               String
  timezone           String
  currency           String                 @db.Char(3)
  phone              String?
  email              String?
  logoUrl            String?                @map("logo_url")
  bannerUrl          String?                @map("banner_url")
  status             String
  subscriptionPlanId String?                @map("subscription_plan_id") @db.Uuid
  publishedAt        DateTime?              @map("published_at") @db.Timestamptz(6)
  createdAt          DateTime               @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime               @updatedAt @map("updated_at") @db.Timestamptz(6)

  owner             User                   @relation("BusinessOwner", fields: [ownerUserId], references: [id], onDelete: Restrict)
  branches          Branch[]
  members           BusinessMember[]
  roles             Role[]
  serviceCategories ServiceCategory[]
  services          Service[]
  staffProfiles     StaffProfile[]
  scheduleBlocks    ScheduleBlock[]
  customers         BusinessCustomer[]
  bookings          Booking[]
  queueTickets      QueueTicket[]
  payments          Payment[]
  paymentConfigurations PaymentConfiguration[]
  vouchers          Voucher[]
  reviews           Review[]
  notifications     Notification[]
  mediaObjects      MediaObject[]
  subscriptions     BusinessSubscription[]
  auditLogs         AuditLog[]

  @@index([ownerUserId])
  @@index([status, publishedAt])
  @@map("businesses")
}

model BusinessMember {
  id         String   @id @default(uuid()) @db.Uuid
  businessId String   @map("business_id") @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  status     String
  joinedAt   DateTime? @map("joined_at") @db.Timestamptz(6)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  business Business   @relation(fields: [businessId], references: [id], onDelete: Restrict)
  user     User       @relation(fields: [userId], references: [id], onDelete: Restrict)
  roles    MemberRole[]

  @@unique([businessId, userId], map: "business_members_business_id_user_id_key")
  @@index([userId, status])
  @@map("business_members")
}

model Role {
  id         String   @id @default(uuid()) @db.Uuid
  businessId String?  @map("business_id") @db.Uuid
  name       String
  isSystem   Boolean  @default(false) @map("is_system")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  business    Business?        @relation(fields: [businessId], references: [id], onDelete: Restrict)
  permissions RolePermission[]
  members     MemberRole[]

  @@unique([businessId, name], map: "roles_business_id_name_key")
  @@index([businessId])
  @@map("roles")
}

model Permission {
  id          String @id @default(uuid()) @db.Uuid
  code        String @unique
  description String

  roles RolePermission[]

  @@map("permissions")
}

model RolePermission {
  roleId       String @map("role_id") @db.Uuid
  permissionId String @map("permission_id") @db.Uuid

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model MemberRole {
  businessMemberId String @map("business_member_id") @db.Uuid
  roleId           String @map("role_id") @db.Uuid

  businessMember BusinessMember @relation(fields: [businessMemberId], references: [id], onDelete: Cascade)
  role           Role           @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([businessMemberId, roleId])
  @@map("member_roles")
}

model Branch {
  id             String   @id @default(uuid()) @db.Uuid
  businessId     String   @map("business_id") @db.Uuid
  name           String
  slug           String
  address        String
  latitude       Decimal? @db.Decimal(9, 6)
  longitude      Decimal? @db.Decimal(9, 6)
  phone          String?
  email          String?
  timezone       String?
  queueEnabled   Boolean  @default(true) @map("queue_enabled")
  bookingEnabled Boolean  @default(true) @map("booking_enabled")
  status         String
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  business       Business            @relation(fields: [businessId], references: [id], onDelete: Restrict)
  openingHours   BranchOpeningHour[]
  serviceLinks   ServiceBranch[]
  staffLinks     StaffBranch[]
  workingHours   StaffWorkingHour[]
  scheduleBlocks ScheduleBlock[]
  bookings       Booking[]
  queueTickets   QueueTicket[]
  queueSequences QueueSequence[]
  reviews        Review[]
  voucherLinks   VoucherBranch[]
  defaultStaff   StaffProfile[]       @relation("DefaultBranch")

  @@unique([businessId, slug], map: "branches_business_id_slug_key")
  @@index([businessId, status])
  @@map("branches")
}

model BranchOpeningHour {
  id        String   @id @default(uuid()) @db.Uuid
  branchId  String   @map("branch_id") @db.Uuid
  dayOfWeek Int      @map("day_of_week")
  startTime DateTime? @map("start_time") @db.Time(0)
  endTime   DateTime? @map("end_time") @db.Time(0)
  closed    Boolean  @default(false)

  branch Branch @relation(fields: [branchId], references: [id], onDelete: Cascade)

  @@index([branchId, dayOfWeek])
  @@map("branch_opening_hours")
}

model ServiceCategory {
  id         String   @id @default(uuid()) @db.Uuid
  businessId String   @map("business_id") @db.Uuid
  name       String
  sortOrder  Int      @default(0) @map("sort_order")
  active     Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  business Business  @relation(fields: [businessId], references: [id], onDelete: Restrict)
  services Service[]

  @@index([businessId, active, sortOrder])
  @@map("service_categories")
}

model Service {
  id                   String      @id @default(uuid()) @db.Uuid
  businessId           String      @map("business_id") @db.Uuid
  categoryId           String?     @map("category_id") @db.Uuid
  name                 String
  slug                 String
  description          String?
  durationMinutes      Int         @map("duration_minutes")
  bufferBeforeMinutes  Int         @default(0) @map("buffer_before_minutes")
  bufferAfterMinutes   Int         @default(0) @map("buffer_after_minutes")
  priceMinor           Int         @map("price_minor")
  currency             String      @db.Char(3)
  depositType          DepositType @default(NONE) @map("deposit_type")
  depositValue         Int         @default(0) @map("deposit_value")
  onlineBookingEnabled Boolean     @default(true) @map("online_booking_enabled")
  walkInEnabled        Boolean     @default(true) @map("walk_in_enabled")
  active               Boolean     @default(true)
  createdAt            DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime    @updatedAt @map("updated_at") @db.Timestamptz(6)

  business        Business          @relation(fields: [businessId], references: [id], onDelete: Restrict)
  category        ServiceCategory?  @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  branchLinks     ServiceBranch[]
  staffLinks      StaffService[]
  bookingServices BookingService[]
  queueTickets    QueueTicket[]
  voucherLinks    VoucherService[]

  @@unique([businessId, slug], map: "services_business_id_slug_key")
  @@index([businessId, categoryId, active])
  @@map("services")
}

model ServiceBranch {
  serviceId String @map("service_id") @db.Uuid
  branchId  String @map("branch_id") @db.Uuid

  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  branch  Branch  @relation(fields: [branchId], references: [id], onDelete: Cascade)

  @@id([serviceId, branchId])
  @@index([branchId])
  @@map("service_branches")
}

model StaffProfile {
  id              String   @id @default(uuid()) @db.Uuid
  businessId      String   @map("business_id") @db.Uuid
  userId          String?  @map("user_id") @db.Uuid
  defaultBranchId String?  @map("default_branch_id") @db.Uuid
  displayName     String   @map("display_name")
  title           String?
  avatarUrl       String?  @map("avatar_url")
  bio             String?
  active          Boolean  @default(true)
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  business      Business           @relation(fields: [businessId], references: [id], onDelete: Restrict)
  user          User?              @relation(fields: [userId], references: [id], onDelete: SetNull)
  defaultBranch Branch?            @relation("DefaultBranch", fields: [defaultBranchId], references: [id], onDelete: SetNull)
  branchLinks   StaffBranch[]
  serviceLinks  StaffService[]
  workingHours  StaffWorkingHour[]
  breaks        StaffBreak[]
  leaves        StaffLeave[]
  scheduleBlocks ScheduleBlock[]
  bookings      Booking[]
  preferredQueueTickets QueueTicket[] @relation("PreferredStaff")
  assignedQueueTickets  QueueTicket[] @relation("AssignedStaff")

  @@index([businessId, active])
  @@index([userId])
  @@map("staff_profiles")
}

model StaffBranch {
  staffId  String @map("staff_id") @db.Uuid
  branchId String @map("branch_id") @db.Uuid

  staff  StaffProfile @relation(fields: [staffId], references: [id], onDelete: Cascade)
  branch Branch       @relation(fields: [branchId], references: [id], onDelete: Cascade)

  @@id([staffId, branchId])
  @@index([branchId])
  @@map("staff_branches")
}

model StaffService {
  staffId               String @map("staff_id") @db.Uuid
  serviceId             String @map("service_id") @db.Uuid
  customDurationMinutes Int?   @map("custom_duration_minutes")
  customPriceMinor      Int?   @map("custom_price_minor")

  staff   StaffProfile @relation(fields: [staffId], references: [id], onDelete: Cascade)
  service Service      @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@id([staffId, serviceId])
  @@index([serviceId])
  @@map("staff_services")
}

model StaffWorkingHour {
  id        String   @id @default(uuid()) @db.Uuid
  staffId   String   @map("staff_id") @db.Uuid
  branchId  String?  @map("branch_id") @db.Uuid
  dayOfWeek Int      @map("day_of_week")
  startTime DateTime @map("start_time") @db.Time(0)
  endTime   DateTime @map("end_time") @db.Time(0)

  staff  StaffProfile @relation(fields: [staffId], references: [id], onDelete: Cascade)
  branch Branch?      @relation(fields: [branchId], references: [id], onDelete: Cascade)

  @@index([staffId, branchId, dayOfWeek])
  @@map("staff_working_hours")
}

model StaffBreak {
  id        String    @id @default(uuid()) @db.Uuid
  staffId   String    @map("staff_id") @db.Uuid
  dayOfWeek Int?      @map("day_of_week")
  localDate DateTime? @map("local_date") @db.Date
  startTime DateTime  @map("start_time") @db.Time(0)
  endTime   DateTime  @map("end_time") @db.Time(0)

  staff StaffProfile @relation(fields: [staffId], references: [id], onDelete: Cascade)

  @@index([staffId, dayOfWeek])
  @@index([staffId, localDate])
  @@map("staff_breaks")
}

model StaffLeave {
  id        String      @id @default(uuid()) @db.Uuid
  staffId   String      @map("staff_id") @db.Uuid
  startAt   DateTime    @map("start_at") @db.Timestamptz(6)
  endAt     DateTime    @map("end_at") @db.Timestamptz(6)
  reason    String?
  status    LeaveStatus @default(PENDING)
  createdAt DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime    @updatedAt @map("updated_at") @db.Timestamptz(6)

  staff StaffProfile @relation(fields: [staffId], references: [id], onDelete: Restrict)

  @@index([staffId, startAt, endAt])
  @@map("staff_leaves")
}

model ScheduleBlock {
  id         String   @id @default(uuid()) @db.Uuid
  businessId String   @map("business_id") @db.Uuid
  staffId    String   @map("staff_id") @db.Uuid
  branchId   String   @map("branch_id") @db.Uuid
  startAt    DateTime @map("start_at") @db.Timestamptz(6)
  endAt      DateTime @map("end_at") @db.Timestamptz(6)
  reason     String?
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  business Business     @relation(fields: [businessId], references: [id], onDelete: Restrict)
  staff    StaffProfile @relation(fields: [staffId], references: [id], onDelete: Restrict)
  branch   Branch       @relation(fields: [branchId], references: [id], onDelete: Restrict)

  @@index([businessId, staffId, startAt, endAt])
  @@index([branchId, startAt, endAt])
  @@map("schedule_blocks")
}

model BusinessCustomer {
  id           String    @id @default(uuid()) @db.Uuid
  businessId   String    @map("business_id") @db.Uuid
  userId       String?   @map("user_id") @db.Uuid
  name         String
  email        String?
  phone        String?
  notes        String?
  lastVisitAt  DateTime? @map("last_visit_at") @db.Timestamptz(6)
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  business     Business      @relation(fields: [businessId], references: [id], onDelete: Restrict)
  user         User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
  bookings     Booking[]
  queueTickets QueueTicket[]
  voucherUsages VoucherUsage[]
  reviews      Review[]

  @@unique([businessId, userId], map: "business_customers_business_id_user_id_key")
  @@index([businessId, phone])
  @@index([businessId, email])
  @@map("business_customers")
}

model Booking {
  id                     String        @id @default(uuid()) @db.Uuid
  publicCode             String        @unique @map("public_code")
  businessId             String        @map("business_id") @db.Uuid
  branchId               String        @map("branch_id") @db.Uuid
  customerId             String        @map("customer_id") @db.Uuid
  staffId                String        @map("staff_id") @db.Uuid
  status                 BookingStatus
  source                 BookingSource
  startAt                DateTime      @map("start_at") @db.Timestamptz(6)
  endAt                  DateTime      @map("end_at") @db.Timestamptz(6)
  timezone               String
  holdExpiresAt          DateTime?     @map("hold_expires_at") @db.Timestamptz(6)
  subtotalMinor          Int           @map("subtotal_minor")
  discountMinor          Int           @default(0) @map("discount_minor")
  taxMinor               Int           @default(0) @map("tax_minor")
  totalMinor             Int           @map("total_minor")
  depositRequiredMinor   Int           @default(0) @map("deposit_required_minor")
  depositPaidMinor       Int           @default(0) @map("deposit_paid_minor")
  currency               String        @db.Char(3)
  note                    String?
  cancellationReason     String?       @map("cancellation_reason")
  checkedInAt            DateTime?     @map("checked_in_at") @db.Timestamptz(6)
  serviceStartedAt       DateTime?     @map("service_started_at") @db.Timestamptz(6)
  completedAt            DateTime?     @map("completed_at") @db.Timestamptz(6)
  createdAt              DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt              DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)

  business      Business         @relation(fields: [businessId], references: [id], onDelete: Restrict)
  branch        Branch           @relation(fields: [branchId], references: [id], onDelete: Restrict)
  customer      BusinessCustomer @relation(fields: [customerId], references: [id], onDelete: Restrict)
  staff         StaffProfile     @relation(fields: [staffId], references: [id], onDelete: Restrict)
  services      BookingService[]
  queueTickets  QueueTicket[]
  payments      Payment[]
  voucherUsages VoucherUsage[]
  review         Review?

  @@index([businessId, branchId, startAt])
  @@index([staffId, startAt, endAt])
  @@index([customerId, createdAt(sort: Desc)])
  @@index([status, holdExpiresAt])
  @@map("bookings")
}

model BookingService {
  id                      String @id @default(uuid()) @db.Uuid
  bookingId               String @map("booking_id") @db.Uuid
  serviceId               String @map("service_id") @db.Uuid
  serviceNameSnapshot     String @map("service_name_snapshot")
  durationMinutesSnapshot Int    @map("duration_minutes_snapshot")
  priceMinorSnapshot      Int    @map("price_minor_snapshot")
  sortOrder               Int    @default(0) @map("sort_order")

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Restrict)
  service Service @relation(fields: [serviceId], references: [id], onDelete: Restrict)

  @@unique([bookingId, sortOrder], map: "booking_services_booking_id_sort_order_key")
  @@index([serviceId])
  @@map("booking_services")
}

model QueueTicket {
  id               String            @id @default(uuid()) @db.Uuid
  businessId       String            @map("business_id") @db.Uuid
  branchId         String            @map("branch_id") @db.Uuid
  bookingId        String?           @map("booking_id") @db.Uuid
  customerId       String?           @map("customer_id") @db.Uuid
  serviceId        String            @map("service_id") @db.Uuid
  preferredStaffId String?           @map("preferred_staff_id") @db.Uuid
  assignedStaffId  String?           @map("assigned_staff_id") @db.Uuid
  businessDate     DateTime          @map("business_date") @db.Date
  ticketNumber     String            @map("ticket_number")
  status           QueueTicketStatus
  priority         Int               @default(0)
  joinedAt         DateTime          @default(now()) @map("joined_at") @db.Timestamptz(6)
  calledAt         DateTime?         @map("called_at") @db.Timestamptz(6)
  serviceStartedAt DateTime?         @map("service_started_at") @db.Timestamptz(6)
  completedAt      DateTime?         @map("completed_at") @db.Timestamptz(6)
  cancelledAt      DateTime?         @map("cancelled_at") @db.Timestamptz(6)

  business       Business          @relation(fields: [businessId], references: [id], onDelete: Restrict)
  branch         Branch            @relation(fields: [branchId], references: [id], onDelete: Restrict)
  booking        Booking?          @relation(fields: [bookingId], references: [id], onDelete: Restrict)
  customer       BusinessCustomer? @relation(fields: [customerId], references: [id], onDelete: Restrict)
  service        Service           @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  preferredStaff StaffProfile?     @relation("PreferredStaff", fields: [preferredStaffId], references: [id], onDelete: Restrict)
  assignedStaff  StaffProfile?     @relation("AssignedStaff", fields: [assignedStaffId], references: [id], onDelete: Restrict)

  @@unique([branchId, businessDate, ticketNumber], map: "queue_tickets_branch_date_ticket_number_key")
  @@index([businessId, branchId, status, joinedAt])
  @@index([bookingId, status])
  @@map("queue_tickets")
}

model QueueSequence {
  branchId    String   @map("branch_id") @db.Uuid
  businessDate DateTime @map("business_date") @db.Date
  prefix      String
  lastNumber  Int      @default(0) @map("last_number")

  branch Branch @relation(fields: [branchId], references: [id], onDelete: Restrict)

  @@id([branchId, businessDate, prefix])
  @@map("queue_sequences")
}

model Payment {
  id                String        @id @default(uuid()) @db.Uuid
  businessId        String        @map("business_id") @db.Uuid
  bookingId         String        @map("booking_id") @db.Uuid
  provider          String
  providerPaymentId String?       @map("provider_payment_id")
  type              PaymentType
  amountMinor       Int           @map("amount_minor")
  currency          String        @db.Char(3)
  status            PaymentStatus
  paidAt            DateTime?     @map("paid_at") @db.Timestamptz(6)
  createdAt         DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)

  business Business @relation(fields: [businessId], references: [id], onDelete: Restrict)
  booking  Booking  @relation(fields: [bookingId], references: [id], onDelete: Restrict)
  refunds  Refund[]

  @@unique([provider, providerPaymentId], map: "payments_provider_provider_payment_id_key")
  @@index([businessId, bookingId])
  @@index([status, createdAt])
  @@map("payments")
}

model PaymentConfiguration {
  id          String   @id @default(uuid()) @db.Uuid
  businessId  String   @map("business_id") @db.Uuid
  provider    String
  enabled     Boolean  @default(true)
  secretRef   String?  @map("secret_ref")
  settingsJson Json?   @map("settings_json")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  business Business @relation(fields: [businessId], references: [id], onDelete: Restrict)

  @@unique([businessId, provider], map: "payment_configurations_business_id_provider_key")
  @@map("payment_configurations")
}

model PaymentEvent {
  id              String    @id @default(uuid()) @db.Uuid
  provider        String
  providerEventId String    @unique @map("provider_event_id")
  eventType       String    @map("event_type")
  payloadHash     String?   @map("payload_hash")
  payloadReference String?  @map("payload_reference")
  processedAt     DateTime? @map("processed_at") @db.Timestamptz(6)
  status          String
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([provider, eventType])
  @@map("payment_events")
}

model Refund {
  id               String        @id @default(uuid()) @db.Uuid
  paymentId        String        @map("payment_id") @db.Uuid
  amountMinor      Int           @map("amount_minor")
  providerRefundId String?       @map("provider_refund_id")
  status           RefundStatus
  reason           String?
  createdAt        DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)

  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Restrict)

  @@unique([providerRefundId])
  @@index([paymentId, status])
  @@map("refunds")
}

model Voucher {
  id                  String      @id @default(uuid()) @db.Uuid
  businessId          String      @map("business_id") @db.Uuid
  code                String
  type                VoucherType
  value               Int
  maxDiscountMinor    Int?        @map("max_discount_minor")
  minimumOrderMinor   Int         @default(0) @map("minimum_order_minor")
  startsAt            DateTime    @map("starts_at") @db.Timestamptz(6)
  endsAt              DateTime    @map("ends_at") @db.Timestamptz(6)
  totalUsageLimit     Int?        @map("total_usage_limit")
  perCustomerLimit    Int?        @map("per_customer_limit")
  active              Boolean     @default(true)
  createdAt           DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime    @updatedAt @map("updated_at") @db.Timestamptz(6)

  business Business      @relation(fields: [businessId], references: [id], onDelete: Restrict)
  usages             VoucherUsage[]
  branchRestrictions  VoucherBranch[]
  serviceRestrictions VoucherService[]

  @@unique([businessId, code], map: "vouchers_business_id_code_key")
  @@index([businessId, active, startsAt, endsAt])
  @@map("vouchers")
}

model VoucherBranch {
  voucherId String @map("voucher_id") @db.Uuid
  branchId  String @map("branch_id") @db.Uuid

  voucher Voucher @relation(fields: [voucherId], references: [id], onDelete: Cascade)
  branch  Branch  @relation(fields: [branchId], references: [id], onDelete: Cascade)

  @@id([voucherId, branchId])
  @@index([branchId])
  @@map("voucher_branches")
}

model VoucherService {
  voucherId String @map("voucher_id") @db.Uuid
  serviceId String @map("service_id") @db.Uuid

  voucher Voucher @relation(fields: [voucherId], references: [id], onDelete: Cascade)
  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@id([voucherId, serviceId])
  @@index([serviceId])
  @@map("voucher_services")
}

model VoucherUsage {
  id            String   @id @default(uuid()) @db.Uuid
  voucherId     String   @map("voucher_id") @db.Uuid
  bookingId     String   @map("booking_id") @db.Uuid
  customerId    String   @map("customer_id") @db.Uuid
  discountMinor Int      @map("discount_minor")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  voucher  Voucher          @relation(fields: [voucherId], references: [id], onDelete: Restrict)
  booking  Booking          @relation(fields: [bookingId], references: [id], onDelete: Restrict)
  customer BusinessCustomer @relation(fields: [customerId], references: [id], onDelete: Restrict)

  @@unique([voucherId, bookingId], map: "voucher_usages_voucher_id_booking_id_key")
  @@index([voucherId, customerId, createdAt])
  @@map("voucher_usages")
}

model Review {
  id                String   @id @default(uuid()) @db.Uuid
  bookingId         String   @unique @map("booking_id") @db.Uuid
  businessId        String   @map("business_id") @db.Uuid
  branchId          String   @map("branch_id") @db.Uuid
  customerId        String   @map("customer_id") @db.Uuid
  overallRating     Int      @map("overall_rating")
  staffRating       Int?     @map("staff_rating")
  serviceRating     Int?     @map("service_rating")
  waitingRating     Int?     @map("waiting_rating")
  comment           String?
  status            String
  businessReply     String?  @map("business_reply")
  businessRepliedAt DateTime? @map("business_replied_at") @db.Timestamptz(6)
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  booking  Booking          @relation(fields: [bookingId], references: [id], onDelete: Restrict)
  business Business         @relation(fields: [businessId], references: [id], onDelete: Restrict)
  branch   Branch           @relation(fields: [branchId], references: [id], onDelete: Restrict)
  customer BusinessCustomer @relation(fields: [customerId], references: [id], onDelete: Restrict)
  media    ReviewMedia[]

  @@index([businessId, branchId, createdAt(sort: Desc)])
  @@map("reviews")
}

model ReviewMedia {
  id        String @id @default(uuid()) @db.Uuid
  reviewId  String @map("review_id") @db.Uuid
  objectKey String @map("object_key")
  sortOrder Int    @default(0) @map("sort_order")

  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@unique([reviewId, objectKey], map: "review_media_review_id_object_key_key")
  @@map("review_media")
}

model Notification {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  businessId String?   @map("business_id") @db.Uuid
  type       String
  title      String
  body       String
  dataJson   Json?     @map("data_json")
  readAt     DateTime? @map("read_at") @db.Timestamptz(6)
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  user       User                   @relation(fields: [userId], references: [id], onDelete: Restrict)
  business   Business?              @relation(fields: [businessId], references: [id], onDelete: Restrict)
  deliveries NotificationDelivery[]

  @@index([userId, readAt, createdAt(sort: Desc)])
  @@index([businessId, createdAt])
  @@map("notifications")
}

model NotificationDelivery {
  id             String                     @id @default(uuid()) @db.Uuid
  notificationId String                     @map("notification_id") @db.Uuid
  channel        NotificationChannel
  provider       String?
  status         NotificationDeliveryStatus @default(PENDING)
  attemptCount   Int                        @default(0) @map("attempt_count")
  deliveredAt    DateTime?                  @map("delivered_at") @db.Timestamptz(6)
  failureReason  String?                    @map("failure_reason")
  createdAt      DateTime                   @default(now()) @map("created_at") @db.Timestamptz(6)

  notification Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)

  @@index([notificationId, channel])
  @@index([status, createdAt])
  @@map("notification_deliveries")
}

model UserDevice {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  platform  String
  deviceId  String   @map("device_id")
  pushToken String   @unique @map("push_token")
  enabled   Boolean  @default(true)
  lastSeenAt DateTime @default(now()) @map("last_seen_at") @db.Timestamptz(6)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, deviceId], map: "user_devices_user_id_device_id_key")
  @@index([userId, enabled])
  @@map("user_devices")
}

model MediaObject {
  id         String   @id @default(uuid()) @db.Uuid
  ownerType  String   @map("owner_type")
  ownerId    String   @map("owner_id") @db.Uuid
  businessId String?  @map("business_id") @db.Uuid
  objectKey  String   @unique @map("object_key")
  mimeType   String   @map("mime_type")
  sizeBytes  Int      @map("size_bytes")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  business Business? @relation(fields: [businessId], references: [id], onDelete: Restrict)

  @@index([businessId, ownerType, ownerId])
  @@map("media_objects")
}

model SubscriptionPlan {
  id              String   @id @default(uuid()) @db.Uuid
  code            String   @unique
  name            String
  priceMinor      Int      @map("price_minor")
  billingInterval String   @map("billing_interval")
  active          Boolean  @default(true)
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  features      PlanFeature[]
  subscriptions BusinessSubscription[]

  @@map("subscription_plans")
}

model PlanFeature {
  planId       String  @map("plan_id") @db.Uuid
  featureCode  String  @map("feature_code")
  limitValue   Int?    @map("limit_value")
  enabled      Boolean @default(true)

  plan SubscriptionPlan @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@id([planId, featureCode])
  @@map("plan_features")
}

model BusinessSubscription {
  id                     String    @id @default(uuid()) @db.Uuid
  businessId             String    @map("business_id") @db.Uuid
  planId                 String    @map("plan_id") @db.Uuid
  status                 String
  currentPeriodStart     DateTime  @map("current_period_start") @db.Timestamptz(6)
  currentPeriodEnd       DateTime  @map("current_period_end") @db.Timestamptz(6)
  providerSubscriptionId String?   @map("provider_subscription_id")
  createdAt              DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt              DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  business Business         @relation(fields: [businessId], references: [id], onDelete: Restrict)
  plan     SubscriptionPlan @relation(fields: [planId], references: [id], onDelete: Restrict)

  @@index([businessId, status])
  @@unique([providerSubscriptionId])
  @@map("business_subscriptions")
}

model AuditLog {
  id           String   @id @default(uuid()) @db.Uuid
  businessId   String?  @map("business_id") @db.Uuid
  actorUserId  String   @map("actor_user_id") @db.Uuid
  action       String
  resourceType String   @map("resource_type")
  resourceId   String   @map("resource_id")
  beforeJson   Json?    @map("before_json")
  afterJson    Json?    @map("after_json")
  ipAddress    String?  @map("ip_address")
  userAgent    String?  @map("user_agent")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  business  Business? @relation(fields: [businessId], references: [id], onDelete: Restrict)
  actorUser User      @relation(fields: [actorUserId], references: [id], onDelete: Restrict)

  @@index([businessId, createdAt(sort: Desc)])
  @@index([actorUserId, createdAt(sort: Desc)])
  @@index([resourceType, resourceId])
  @@map("audit_logs")
}
```

## 5. Database-only constraints Prisma cannot fully express

Add these as explicit SQL migrations where applicable:

1. `day_of_week BETWEEN 0 AND 6` for recurring schedule tables.
2. `start_time < end_time` for branch/staff working-hour rows and breaks.
3. `start_at < end_at` for leaves, schedule blocks and bookings.
4. `overall_rating`, `staff_rating`, `service_rating`, `waiting_rating` must be `1..5` when non-null.
5. Monetary columns ending in `_minor` must be `>= 0`, except where a future explicitly-approved accounting adjustment requires signed values.
6. `services.deposit_value`:
   - `NONE` => `0`.
   - `FIXED_AMOUNT` => minor units, `>= 0`.
   - `PERCENTAGE` => basis points `0..10000`.
7. `staff_breaks`: exactly one of `day_of_week` or `local_date` must be set.
8. Voucher percentage `value` must be `1..10000` basis points; fixed `value` must be non-negative minor units.
9. Queue ticket uniqueness is `(branch_id, business_date, ticket_number)`.
10. A booking may have only one active queue ticket at a time. Enforce through transaction/partial unique index if the implementation uses a database partial index.

## 6. Relationship summary

- `User 1-N Business` as owner; users also join businesses through `business_members`.
- `Business N-N User` through `business_members`.
- `BusinessMember N-N Role` through `member_roles`.
- `Role N-N Permission` through `role_permissions`.
- `Business 1-N Branch`, `ServiceCategory`, `Service`, `StaffProfile`, `BusinessCustomer`, `Booking`, `QueueTicket`, `Payment`, `PaymentConfiguration`, `Voucher`, `Review`.
- `Service N-N Branch` through `service_branches`.
- `StaffProfile N-N Branch` through `staff_branches`.
- `StaffProfile N-N Service` through `staff_services`.
- `Booking 1-N BookingService`; booking services are immutable commercial snapshots.
- `Booking 0..N Payment`; `Payment 0..N Refund`.
- `Booking 0..1 Review`.
- `Booking 0..N QueueTicket`, but at most one active ticket per booking.
- `Voucher 1-N VoucherUsage`; usage is created transactionally with booking lifecycle logic.
- `Voucher N-N Branch` through `voucher_branches`; `Voucher N-N Service` through `voucher_services`.
- `Notification 1-N NotificationDelivery`.
- `SubscriptionPlan 1-N PlanFeature`; businesses subscribe through `business_subscriptions`.

## 7. Index rules for hot paths

Minimum index coverage:

- availability: `bookings(staff_id, start_at, end_at)` and schedule indexes by staff/date.
- business booking list: `(business_id, branch_id, start_at)`.
- customer history: `(customer_id, created_at DESC)`.
- active queue: `(business_id, branch_id, status, joined_at)`.
- unread notifications: `(user_id, read_at, created_at DESC)`.
- business/service slug lookup: tenant-scoped unique slug indexes.
- voucher lookup: `(business_id, code)` unique.
- payment provider IDs and webhook event IDs: unique/indexed.

Do not add speculative indexes. Use query plans for hot paths before expanding the index set.

## 8. Migration rules

- Every schema change requires a versioned migration.
- Never edit a migration already applied to shared/staging/production databases.
- Destructive migrations require review and an explicit data-migration/rollback plan.
- Backfill new non-null fields before enforcing `NOT NULL` on populated environments.
- For high-volume tables, avoid long table locks; use phased migrations when necessary.
- Seed demo data only in development/demo environments; never seed demo passwords/secrets in production.

## 9. Repository/query invariants

Every tenant repository method must receive `businessId` from trusted application context, for example:

```ts
type TenantScope = Readonly<{
  businessId: string;
}>;

async function findBookingById(scope: TenantScope, bookingId: string) {
  return prisma.booking.findFirst({
    where: {
      id: bookingId,
      businessId: scope.businessId,
    },
  });
}
```

Forbidden pattern:

```ts
// Never trust businessId supplied by an arbitrary request body for tenant authorization.
await prisma.booking.findUnique({ where: { id: body.bookingId } });
```

## 10. Change control

A change to any table, enum, relation, public identifier, tenant ownership rule, money representation or time representation is an architectural change. Update at minimum:

1. `01_DATABASE_SCHEMA.md`
2. Prisma migration/schema
3. API contract when payload shape changes
4. affected state/business rules
5. integration tests for tenant isolation and critical invariants
