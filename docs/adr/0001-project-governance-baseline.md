# ADR-0001 — Project governance baseline

- Status: Accepted
- Date: 2026-09-17
- Owners: BookFlow maintainers
- Supersedes: None
- Superseded by: None

## Context

BookFlow starts from a documentation-first repository and needs repeatable
tooling and contribution rules before application code is introduced. Without
a recorded baseline, package-manager, runtime, branching and review decisions
can drift between phases.

## Decision

- Use pnpm `10.15.0` as the only package manager.
- Pin Node.js to `24.15.0` in both common version-manager formats and in the
  package manifest.
- Require TypeScript strict mode through the root configuration.
- Use trunk-based development with short-lived branches and a protected
  `main`; prefer squash merge.
- Use Conventional Commits.
- Track each roadmap phase as a matching issue/milestone entry with explicit
  dependencies. Until a GitHub remote exists, the versioned phase registry is
  the tracking source.
- Classify bugs using the S0–S3 severity model in the phase registry.
- Use ADRs for consequential architectural decisions and the pull-request
  checklist for change control.

## Consequences

Contributors need the pinned Node/pnpm versions. Phase 1 can extend the root
manifest and TypeScript configuration but may not silently change this
baseline. A runtime or package-manager upgrade requires an ADR and coordinated
updates to all pins and CI/deployment configuration.

## Alternatives considered

- GitFlow was rejected because long-lived integration branches add overhead
  and drift for the intended delivery model.
- Unpinned runtime/package-manager ranges were rejected because local and CI
  behavior would not be reproducible.
- Chat-only architecture decisions were rejected because they are not durable
  or reviewable with code.

## Validation

Reviewers verify the root version pins, strict compiler options, pull-request
checklist, phase registry and ADR index whenever the governance baseline
changes.
