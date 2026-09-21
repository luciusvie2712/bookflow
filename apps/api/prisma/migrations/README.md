# Prisma migration policy

Migration directories use Prisma's timestamped snake-case convention:

```text
<YYYYMMDDHHMMSS>_<snake_case_description>/migration.sql
```

Create a migration locally with:

```bash
pnpm db:migrate:dev -- --name add_booking_indexes
```

Apply committed migrations with `pnpm db:migrate`. Once a migration has been
applied outside a disposable local database, never edit or rename it; add a new
migration instead. Destructive changes require an explicit backfill/rollback
plan and review.

`pnpm db:reset` is for disposable local development only. It drops and rebuilds
the configured database from committed migrations, regenerates Prisma Client,
and reapplies the development seed.
