# Contributing to BookFlow

Read [the documentation index](docs/README.md) before changing architecture,
contracts or domain behavior. The source-priority order in that document is
binding when requirements conflict.

## Toolchain

- Node.js `24.15.0` (see `.node-version` and `.nvmrc`).
- pnpm `10.15.0`, pinned by the root `package.json`.
- TypeScript strict mode is mandatory. Packages extend the root
  `tsconfig.json` and may tighten it, but must not disable `strict`.

Run `corepack enable` once if pnpm is not already available. Phase 1 adds the
workspace commands and application-specific checks.

## Branch strategy

BookFlow uses trunk-based development around a protected `main` branch.

- Branch from the latest `main` and keep branches short lived.
- Use `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `docs/<issue>-<slug>` or
  `chore/<issue>-<slug>`. Automated Codex branches use the required
  `codex/` prefix.
- Open a pull request; do not push feature work directly to `main`.
- Prefer squash merge after required checks and review pass.
- Rebase or update the branch before merge. Delete merged branches.
- Release stabilization uses tags or a temporary `release/<version>` branch;
  long-lived `develop` branches are not used.
- Production hotfixes branch from the production tag, merge through a pull
  request, and are immediately reconciled back into `main`.

## Commit convention

Use Conventional Commits:

```text
<type>(optional-scope): <imperative summary>
```

Allowed primary types are `feat`, `fix`, `docs`, `refactor`, `test`, `perf`,
`build`, `ci`, `chore` and `revert`. Add `!` and a `BREAKING CHANGE:` footer
for breaking changes. Reference the issue in the footer, for example
`Refs: #42`. Commits must not contain generated secrets, credentials or local
environment files.

## Pull requests

- Keep a pull request focused on one issue or cohesive change.
- Complete `.github/PULL_REQUEST_TEMPLATE.md`.
- Update canonical docs in the same pull request when a contract or
  architectural decision changes.
- Add or update tests proportionate to the changed risk.
- Do not merge when required lint, typecheck, test, build or security checks
  fail.
- Use an ADR for consequential architectural decisions; see `docs/adr/`.

## Secrets

Only sanitized `.env.example` files may be committed. Never commit `.env`
files, private keys, tokens, production credentials or copied provider
payloads containing sensitive data. If a secret is committed, revoke or rotate
it first, then remove it from the repository history and document the incident.
