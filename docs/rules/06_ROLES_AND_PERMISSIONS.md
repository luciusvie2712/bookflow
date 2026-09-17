# BookFlow — Roles & Permissions (RBAC)

**Status:** Canonical Rules/Context Document  
**Source:** `BookFlow_Project_Overview.md` v1.0 — 17/09/2026  
**Scope:** Tenant RBAC, permission registry, NestJS authorization flow, default roles, custom roles and platform-admin separation.

## 1. Authorization principles

1. Permission checks are based on permission codes, not hard-coded role names.
2. A user may belong to multiple businesses and have different roles in each business.
3. A business is a tenant. Membership in Business A never grants access to Business B.
4. Roles are tenant-scoped except system role templates.
5. Custom roles are supported where the subscription plan permits them.
6. Owner/manager/staff labels are defaults/templates; authorization still resolves effective permissions.
7. Platform Admin is a platform-level actor and is not modeled as a normal tenant role.
8. UI hiding is convenience only. Server-side authorization is authoritative.

## 2. Canonical authorization check order

For a tenant mutation:

```text
Authentication
-> Resolve target business
-> Verify active business membership
-> Resolve effective permissions
-> Verify required permission(s)
-> Verify tenant scope of target resource
-> Verify resource/domain state
-> Execute mutation
```

For tenant reads, the same tenant-membership and permission checks apply unless the endpoint is explicitly public.

## 3. Canonical permission naming

Format:

```text
<resource>.<action>
```

Rules:

- lowercase
- singular resource names
- dot separator
- stable codes once released
- do not encode role names into permission codes

## 4. Canonical permission registry

### 4.1 Business

```text
business.read
business.update
business.publish
```

### 4.2 Branch

```text
branch.read
branch.manage
```

### 4.3 Service/catalog

```text
service.read
service.manage
```

### 4.4 Staff

```text
staff.read
staff.manage
```

### 4.5 Schedule

```text
schedule.read
schedule.manage
```

### 4.6 Booking

```text
booking.read
booking.create
booking.update
booking.cancel
booking.refund
```

`booking.update` covers operational transitions such as start/complete/no-show where a more specific permission is not introduced.

### 4.7 Queue

```text
queue.read
queue.manage
```

### 4.8 Customer CRM

```text
customer.read
customer.manage
```

### 4.9 Voucher/promotion

```text
voucher.read
voucher.manage
```

### 4.10 Review

```text
review.read
review.reply
review.manage
```

`review.manage` is for moderation/status handling, not editing customer-authored content.

### 4.11 Payment

```text
payment.read
payment.manage
payment.refund
```

For backward compatibility with the overview's permission example, a refund endpoint may accept `booking.refund` as the business-action permission. New code should prefer `payment.refund` for payment-resource authorization while keeping one consistent policy in the guard/use case.

### 4.12 Analytics

```text
analytics.read
```

### 4.13 Roles/members

```text
role.read
role.manage
member.read
member.manage
```

### 4.14 Subscription

```text
subscription.read
subscription.manage
```

### 4.15 Audit

```text
audit.read
```

### 4.16 Files/media

```text
file.manage
```

## 5. Seeded permissions

The `permissions` table is global and seeded from the canonical registry. Permission codes are not created ad hoc when a user creates a custom role.

Each permission row contains:

```text
id
code
description
```

The application should fail loudly in development/test if code references an unknown permission constant.

## 6. Default role templates

Default roles are convenience templates. Businesses may use custom roles when feature gating allows it.

### 6.1 Business Owner

Tenant owner has all tenant permissions.

Canonical handling:

- do not rely only on `owner_user_id` bypass checks deep in repositories
- authorization service may grant owner the complete tenant permission set
- ownership does not bypass resource tenant validation

### 6.2 Manager

Recommended default manager permission set:

```text
business.read
branch.read
service.read
service.manage
staff.read
staff.manage
schedule.read
schedule.manage
booking.read
booking.create
booking.update
booking.cancel
queue.read
queue.manage
customer.read
customer.manage
voucher.read
voucher.manage
review.read
review.reply
payment.read
analytics.read
member.read
role.read
```

Refund, role mutation, subscription management and other sensitive actions should only be included when explicitly granted.

### 6.3 Staff

Recommended minimal default staff set:

```text
business.read
branch.read
service.read
staff.read
schedule.read
booking.read
queue.read
```

Operational permissions such as `booking.update`, `queue.manage` or schedule editing are granted according to business policy. Do not assume every staff member can manage the queue or edit schedules.

### 6.4 Custom role

A custom role contains any permitted subset of tenant permission codes subject to feature gating and safety policies.

Do not allow a custom tenant role to grant platform-admin authority.

## 7. Customer authorization

Customer access is ownership/resource-policy based, not tenant RBAC membership.

Examples:

- customer may read their own booking
- customer may cancel/reschedule their own booking when policy permits
- customer may create one review for their completed booking
- customer may see only queue information intended for that customer/public branch snapshot

Do not add customer accounts to `business_members` merely to authorize customer booking flows.

## 8. Platform Admin separation

Platform Admin capabilities include:

- business/user/subscription administration
- suspend/restore business account
- platform metrics
- feature flags
- audit/support tools

Rules:

- use a separate platform authorization guard/policy
- platform admin routes live under `/api/v1/admin/**`
- do not represent platform admin as a tenant custom role
- sensitive platform actions require audit logging

## 9. NestJS decorator contract

Canonical usage:

```ts
@RequirePermission('booking.create')
@Post('businesses/:businessId/bookings')
createBooking() {
  // Controller delegates to application service.
}
```

Multiple permissions default to “all required” unless a dedicated `RequireAnyPermission` decorator is used.

## 10. Permission constants

Use constants/types instead of repeated string literals throughout the codebase.

```ts
export const PERMISSIONS = {
  BUSINESS_READ: 'business.read',
  BUSINESS_UPDATE: 'business.update',
  BUSINESS_PUBLISH: 'business.publish',
  BRANCH_READ: 'branch.read',
  BRANCH_MANAGE: 'branch.manage',
  SERVICE_READ: 'service.read',
  SERVICE_MANAGE: 'service.manage',
  STAFF_READ: 'staff.read',
  STAFF_MANAGE: 'staff.manage',
  SCHEDULE_READ: 'schedule.read',
  SCHEDULE_MANAGE: 'schedule.manage',
  BOOKING_READ: 'booking.read',
  BOOKING_CREATE: 'booking.create',
  BOOKING_UPDATE: 'booking.update',
  BOOKING_CANCEL: 'booking.cancel',
  BOOKING_REFUND: 'booking.refund',
  QUEUE_READ: 'queue.read',
  QUEUE_MANAGE: 'queue.manage',
  CUSTOMER_READ: 'customer.read',
  CUSTOMER_MANAGE: 'customer.manage',
  VOUCHER_READ: 'voucher.read',
  VOUCHER_MANAGE: 'voucher.manage',
  REVIEW_READ: 'review.read',
  REVIEW_REPLY: 'review.reply',
  REVIEW_MANAGE: 'review.manage',
  PAYMENT_READ: 'payment.read',
  PAYMENT_MANAGE: 'payment.manage',
  PAYMENT_REFUND: 'payment.refund',
  ANALYTICS_READ: 'analytics.read',
  ROLE_READ: 'role.read',
  ROLE_MANAGE: 'role.manage',
  MEMBER_READ: 'member.read',
  MEMBER_MANAGE: 'member.manage',
  SUBSCRIPTION_READ: 'subscription.read',
  SUBSCRIPTION_MANAGE: 'subscription.manage',
  AUDIT_READ: 'audit.read',
  FILE_MANAGE: 'file.manage',
} as const;

export type PermissionCode =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
```

## 11. Decorator implementation pattern

```ts
import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from './permissions.constants';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';

export const RequirePermission = (...permissions: PermissionCode[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
```

## 12. Guard implementation responsibilities

A permission guard must:

1. read authenticated user from request context
2. identify target business from verified route/context
3. load active membership for `(businessId, userId)`
4. load effective role permissions
5. compare required permission codes
6. attach trusted tenant context for downstream services
7. deny with `TENANT_ACCESS_DENIED`/`FORBIDDEN` as appropriate

It must not trust:

- `body.businessId`
- client-supplied permission lists
- client-supplied role names

## 13. Example guard skeleton

```ts
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? [];

    if (required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.auth.userId;
    const businessId = request.params.businessId;

    const authz = await this.authorizationService.resolveTenantAuthorization({
      userId,
      businessId,
    });

    const allowed = required.every((permission) =>
      authz.permissions.has(permission),
    );

    if (!allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    }

    request.tenant = {
      businessId: authz.businessId,
      membershipId: authz.membershipId,
      permissions: authz.permissions,
    };

    return true;
  }
}
```

## 14. Resource tenant verification

A permission guard proves the user can act within the tenant. The application/repository must still prove the target resource belongs to that tenant.

Required repository pattern:

```ts
await prisma.booking.findFirst({
  where: {
    id: bookingId,
    businessId: tenant.businessId,
  },
});
```

Forbidden:

```ts
await prisma.booking.findUnique({
  where: { id: bookingId },
});
```

followed by mutation without tenant comparison.

## 15. WebSocket authorization

Room joins require the same server-side authorization principles.

Examples:

- `business:{businessId}` requires active tenant membership/permission appropriate to the event stream
- `branch:{branchId}` resolves branch -> business then verifies tenant membership
- `customer:{customerId}` verifies current customer identity/ownership
- `staff:{staffId}` verifies staff/member relation and policy

Never let the client join arbitrary room names unchecked.

## 16. Feature gating and RBAC

Feature availability and permission are separate checks.

Example:

```text
RequireFeature('advanced_analytics')
AND
RequirePermission('analytics.read')
```

A permission never grants a feature that the business subscription does not include.

Likewise, a paid feature does not grant a user permission automatically.

## 17. Audit requirements

Audit sensitive authorization/administrative changes:

- role creation/update/deletion
- permission assignment changes
- member role changes
- staff activation/deactivation
- refund actions
- subscription changes
- business suspension

Audit record should include actor, business, resource, before/after state where appropriate, request metadata and timestamp.

## 18. Authorization tests

Mandatory integration cases:

1. member of Business A cannot access Business B resource by ID tampering
2. staff without `booking.cancel` cannot cancel
3. manager with permission can act only inside their tenant
4. custom role permission changes take effect correctly
5. owner remains tenant-scoped
6. feature enabled but permission absent => denied
7. permission present but plan feature absent => denied
8. unauthorized WebSocket room join => denied
9. platform admin path is protected separately from tenant RBAC

## 19. Change policy

Adding/removing/renaming a permission requires synchronized updates to:

- this registry
- permission seed/migration
- NestJS decorators/guards/policies
- default role templates
- business role-management UI
- API docs if endpoint authorization changes
- authorization tests
