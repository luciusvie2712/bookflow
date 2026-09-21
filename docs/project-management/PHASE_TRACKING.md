# BookFlow Phase Tracking Registry

This is the versioned tracking source until a GitHub remote is configured.
When GitHub is available, create one milestone and one umbrella issue per row,
using the exact title and dependency links below. Detailed scope, tests and
exit criteria remain canonical in `docs/rules/08_IMPLEMENTATION_ROADMAP.md`.

## Workflow

Phase issues use `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `READY_FOR_REVIEW`
or `DONE`. An issue may move to `DONE` only when its roadmap exit criteria and
mandatory tests pass. Dependencies are finish-to-start unless an issue
explicitly documents a safe exception.

## Milestones and umbrella issues

| Phase | Milestone / issue title | Depends on | Initial status |
|---:|---|---|---|
| 00 | Phase 00 — Project Governance & Execution Baseline | None | DONE |
| 01 | Phase 01 — Monorepo Bootstrap | 00 | DONE |
| 02 | Phase 02 — Local Infrastructure & Config Foundation | 01 | DONE |
| 03 | Phase 03 — Database Baseline, Prisma & Migrations | 02 | NOT_STARTED |
| 04 | Phase 04 — Authentication & Session Security | 03 | NOT_STARTED |
| 05 | Phase 05 — Multi-tenancy, Membership & RBAC | 04 | NOT_STARTED |
| 06 | Phase 06 — Business Onboarding & Master Data | 05 | NOT_STARTED |
| 07 | Phase 07 — Scheduling Rules | 06 | NOT_STARTED |
| 08 | Phase 08 — Availability Engine | 07 | NOT_STARTED |
| 09 | Phase 09 — Booking Domain & Concurrency Protection | 08 | NOT_STARTED |
| 10 | Phase 10 — Customer Web Core | 09 | NOT_STARTED |
| 11 | Phase 11 — Business Web Operations | 09 | NOT_STARTED |
| 12 | Phase 12 — Queue Domain | 09, 11 | NOT_STARTED |
| 13 | Phase 13 — Realtime WebSocket | 12 | NOT_STARTED |
| 14 | Phase 14 — Customer Mobile | 10, 13 | NOT_STARTED |
| 15 | Phase 15 — Signed QR Check-in | 12, 14 | NOT_STARTED |
| 16 | Phase 16 — Payment & Deposit | 09 | NOT_STARTED |
| 17 | Phase 17 — Vouchers & Promotions | 09, 16 | NOT_STARTED |
| 18 | Phase 18 — Notifications & Background Jobs | 09, 16 | NOT_STARTED |
| 19 | Phase 19 — Reviews & Customer CRM Completion | 09, 18 | NOT_STARTED |
| 20 | Phase 20 — Search, Location & Media | 06, 08 | NOT_STARTED |
| 21 | Phase 21 — Analytics | 09, 12, 16 | NOT_STARTED |
| 22 | Phase 22 — Audit Logging & Security Hardening | 05, 16 | NOT_STARTED |
| 23 | Phase 23 — Subscriptions & Feature Gating | 05, 22 | NOT_STARTED |
| 24 | Phase 24 — Admin Web | 21, 22, 23 | NOT_STARTED |
| 25 | Phase 25 — Observability | 18, 22 | NOT_STARTED |
| 26 | Phase 26 — Comprehensive Testing | 10–25 as applicable | NOT_STARTED |
| 27 | Phase 27 — CI/CD | 25, 26 | NOT_STARTED |
| 28 | Phase 28 — Deployment | 27 | NOT_STARTED |
| 29 | Phase 29 — Demo Data & Recruiter Flow | 28 | NOT_STARTED |
| 30 | Phase 30 — README, Documentation & Portfolio Polish | 29 | NOT_STARTED |

The dependency graph records the earliest safe prerequisites. It does not
authorize bypassing the critical-path order or phase-specific preconditions in
the roadmap.

## Issue rules

- Use `.github/ISSUE_TEMPLATE/phase.yml` for umbrella phase issues.
- Split implementation into child issues when needed; each child states its
  parent phase and `Blocked by` links.
- A blocked issue names the exact unresolved dependency or decision.
- Architecture decisions link an ADR. Contract changes link the updated
  canonical document.
- Critical defects are not hidden inside phase checklists; file a bug issue
  and link it to the affected phase.

## Bug severity

| Severity | Definition | Examples | Handling |
|---|---|---|---|
| S0 — Critical | Active security breach, cross-tenant exposure, irreversible data loss/corruption, or unsafe financial processing | tenant leak, auth bypass, duplicate charge | Stop release; assign immediately; preserve safe evidence |
| S1 — High | Core path unavailable or incorrect with no safe workaround | double booking, login outage, wrong booking/payment state | Block affected phase/release; prioritize before feature work |
| S2 — Medium | Material degradation with a safe workaround; limited blast radius | broken filter, delayed non-critical notification | Schedule in the current/next relevant milestone |
| S3 — Low | Cosmetic, minor usability or maintainability defect | copy, spacing, non-critical polish | Triage against higher-priority work |

Severity describes impact; roadmap priority (`P0`–`P3`) describes scheduling.
Use both when useful, for example `severity:S1` and `priority:P0`.

## GitHub bootstrap checklist

After a remote is configured:

1. Configure private vulnerability reporting and add its security-advisory
   contact link to `.github/ISSUE_TEMPLATE/config.yml`.
2. Create labels for phase, bug, statuses, S0–S3 and P0–P3.
3. Create the 31 milestones and umbrella issues from the table.
4. Link issue dependencies and copy each phase's roadmap checklist/exit
   criteria into its issue.
5. Enable branch protection and required pull-request checks on `main`.
