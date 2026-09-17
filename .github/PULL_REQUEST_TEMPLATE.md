## Summary

<!-- What changed and why? Link the issue. -->

## Dependencies

<!-- List prerequisite issues/PRs, or write "None". -->

## Validation

- [ ] Relevant lint checks pass.
- [ ] TypeScript typecheck passes with strict mode enabled.
- [ ] Relevant unit/integration/E2E tests pass.
- [ ] Affected applications/packages build successfully.

## Correctness and security

- [ ] Inputs and error codes follow the API contract.
- [ ] Authorization and tenant scope were reviewed where applicable.
- [ ] Critical writes preserve transaction/concurrency invariants.
- [ ] Money and timezone handling follow canonical rules.
- [ ] No secret, local `.env` file, token or credential is included.
- [ ] Logs contain no sensitive values.

## Change control

- [ ] Canonical docs/OpenAPI were updated, or no contract changed.
- [ ] A migration was added for schema changes; deployed migrations were not edited.
- [ ] An ADR was added/updated for a consequential architecture decision, or not applicable.
- [ ] Rollback/compatibility impact is described for risky changes, or not applicable.

## Evidence

<!-- Commands run, screenshots, logs or test output. -->
