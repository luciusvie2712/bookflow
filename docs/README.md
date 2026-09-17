# BookFlow Documentation

This directory contains the canonical documentation for the BookFlow project.

## Source Priority

When requirements or implementation details conflict, use the following priority:

1. `BookFlow_Project_Overview.md`
2. `rules/01_DATABASE_SCHEMA.md`
3. `rules/05_STATE_MACHINES_AND_BUSINESS_RULES.md`
4. `rules/03_API_SPECIFICATION.md`
5. `rules/06_ROLES_AND_PERMISSIONS.md`
6. `rules/02_CODING_CONVENTIONS.md`
7. `rules/04_PROJECT_STRUCTURE.md`
8. `rules/07_ENV_AND_CONFIG.md`
9. `rules/08_IMPLEMENTATION_ROADMAP.md`
10. Existing implementation code

## Mandatory Rules

Before changing architecture, database schema, domain models, public API,
authorization rules, booking logic, payment logic, realtime contracts or
tenant-scoped behavior, review the relevant documentation first.

The following invariants must never be silently simplified:

- Tenant isolation by `business_id`
- Database-level booking concurrency protection
- Payment webhook signature verification and idempotency
- Signed or opaque secure QR check-in
- RBAC and permission enforcement
- Booking state machine
- Server-side monetary calculations
- UTC timestamp persistence and IANA timezone handling
- Realtime room authorization
- Background processing for non-request-path side effects

## Documentation Changes

When a requirement becomes an official project decision, update the relevant
documentation in the same pull request as the code change.

Do not leave architectural decisions only in chat messages, issues or source
code comments. Consequential decisions are recorded in
[`docs/adr/`](adr/README.md), and delivery status is tracked in
[`docs/project-management/PHASE_TRACKING.md`](project-management/PHASE_TRACKING.md).
