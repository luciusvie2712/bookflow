# Architecture Decision Records

ADRs capture consequential decisions that should not exist only in chat,
issues or source comments. They complement the canonical rules; they do not
override the source-priority order in `docs/README.md`.

## When an ADR is required

Create an ADR when a change affects architecture boundaries, persistence,
public contracts, authentication/authorization, concurrency, provider choice,
deployment topology or another decision that is costly to reverse.

Copy `TEMPLATE.md` to the next zero-padded number, for example
`0002-booking-overlap-protection.md`. Use one of these statuses: `Proposed`,
`Accepted`, `Superseded` or `Rejected`. A superseding ADR links the old ADR,
and the old ADR links back to the new one.

## Index

| ADR | Status | Decision |
|---|---|---|
| [0001](0001-project-governance-baseline.md) | Accepted | Project governance baseline |
