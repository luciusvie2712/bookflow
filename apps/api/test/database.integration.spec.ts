import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { Pool, type QueryResult } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadApiEnvironmentFiles } from "../src/config/environment-loader.js";

loadApiEnvironmentFiles();

const applicationRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceDatabaseUrl = process.env.DATABASE_URL;

if (!sourceDatabaseUrl) {
  throw new Error("DATABASE_URL is required for database integration tests.");
}

const databaseName = `bookflow_phase3_${process.pid}_${Date.now()}`;
const adminUrl = new URL(sourceDatabaseUrl);
adminUrl.pathname = "/postgres";
adminUrl.search = "";

const testUrl = new URL(sourceDatabaseUrl);
testUrl.pathname = `/${databaseName}`;

const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let testPool: Pool;

function runApiScript(script: "db:migrate" | "db:seed"): void {
  const environment = {
    ...process.env,
    DATABASE_URL: testUrl.toString(),
    NODE_ENV: "test",
  };

  if (process.platform === "win32") {
    execFileSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", `pnpm run ${script}`],
      { cwd: applicationRoot, env: environment, stdio: "pipe" },
    );
    return;
  }

  execFileSync("pnpm", ["run", script], {
    cwd: applicationRoot,
    env: environment,
    stdio: "pipe",
  });
}

async function expectPostgresError(
  query: Promise<QueryResult>,
  expectedCode: string,
): Promise<void> {
  try {
    await query;
    throw new Error(`Expected PostgreSQL error ${expectedCode}.`);
  } catch (error) {
    expect((error as { code?: string }).code).toBe(expectedCode);
  }
}

describe("Phase 3 database baseline", () => {
  beforeAll(async () => {
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    runApiScript("db:migrate");
    runApiScript("db:seed");
    testPool = new Pool({ connectionString: testUrl.toString(), max: 2 });
  }, 60_000);

  afterAll(async () => {
    await testPool?.end();
    await adminPool.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [databaseName],
    );
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.end();
  });

  it("applies the initial migration to an empty database and seeds demo data", async () => {
    const migrations = await testPool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL',
    );
    const permissions = await testPool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM permissions",
    );
    const business = await testPool.query<{ slug: string }>(
      "SELECT slug FROM businesses WHERE slug = 'bookflow-demo'",
    );

    expect(migrations.rows[0]?.count).toBe("2");
    expect(permissions.rows[0]?.count).toBe("37");
    expect(business.rows[0]?.slug).toBe("bookflow-demo");
  });

  it("enforces foreign keys", async () => {
    await expectPostgresError(
      testPool.query(
        `INSERT INTO branches (id, business_id, name, slug, address, status, updated_at)
         VALUES ('90000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000099', 'Invalid', 'invalid', 'Invalid', 'ACTIVE', CURRENT_TIMESTAMP)`,
      ),
      "23503",
    );
  });

  it("enforces global and tenant-scoped unique constraints", async () => {
    await expectPostgresError(
      testPool.query(
        `INSERT INTO users (id, email, full_name, status, updated_at)
         VALUES ('90000000-0000-4000-8000-000000000002', 'owner@bookflow.local', 'Duplicate', 'ACTIVE', CURRENT_TIMESTAMP)`,
      ),
      "23505",
    );

    await testPool.query(
      `INSERT INTO businesses (id, owner_user_id, name, slug, type, timezone, currency, status, updated_at)
       VALUES ('90000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Second Tenant', 'second-tenant', 'SALON', 'Asia/Ho_Chi_Minh', 'VND', 'ACTIVE', CURRENT_TIMESTAMP)`,
    );
    await testPool.query(
      `INSERT INTO branches (id, business_id, name, slug, address, status, updated_at)
       VALUES ('90000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000003', 'District 1', 'district-1', 'Second tenant', 'ACTIVE', CURRENT_TIMESTAMP)`,
    );

    await expectPostgresError(
      testPool.query(
        `INSERT INTO branches (id, business_id, name, slug, address, status, updated_at)
         VALUES ('90000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000003', 'Duplicate', 'district-1', 'Second tenant', 'ACTIVE', CURRENT_TIMESTAMP)`,
      ),
      "23505",
    );
  });

  it("enforces canonical check constraints", async () => {
    await expectPostgresError(
      testPool.query(
        `INSERT INTO branch_opening_hours (id, branch_id, day_of_week, start_time, end_time, closed)
         VALUES ('90000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', 7, '09:00', '18:00', FALSE)`,
      ),
      "23514",
    );
  });

  it("keeps queue IDs private and permits one active ticket per booking", async () => {
    const primaryKey = await testPool.query<{ column_name: string }>(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
       WHERE tc.table_name = 'queue_tickets' AND tc.constraint_type = 'PRIMARY KEY'`,
    );
    expect(primaryKey.rows.map((row) => row.column_name)).toEqual(["id"]);

    await testPool.query(
      `INSERT INTO queue_tickets (
         id, business_id, branch_id, booking_id, customer_id, service_id,
         business_date, ticket_number, status
       ) VALUES (
         '90000000-0000-4000-8000-000000000007',
         '20000000-0000-4000-8000-000000000001',
         '30000000-0000-4000-8000-000000000001',
         '50000000-0000-4000-8000-000000000001',
         '40000000-0000-4000-8000-000000000001',
         '32000000-0000-4000-8000-000000000001',
         CURRENT_DATE, 'A001', 'WAITING'
       )`,
    );

    await expectPostgresError(
      testPool.query(
        `INSERT INTO queue_tickets (
           id, business_id, branch_id, booking_id, customer_id, service_id,
           business_date, ticket_number, status
         ) VALUES (
           '90000000-0000-4000-8000-000000000008',
           '20000000-0000-4000-8000-000000000001',
           '30000000-0000-4000-8000-000000000001',
           '50000000-0000-4000-8000-000000000001',
           '40000000-0000-4000-8000-000000000001',
           '32000000-0000-4000-8000-000000000001',
           CURRENT_DATE, 'A002', 'CALLED'
         )`,
      ),
      "23505",
    );
  });

  it("enforces payment event and review idempotency", async () => {
    await testPool.query(
      `INSERT INTO payment_events (id, provider, provider_event_id, event_type, status)
       VALUES ('90000000-0000-4000-8000-000000000009', 'demo', 'evt-001', 'payment.paid', 'PROCESSED')`,
    );
    await expectPostgresError(
      testPool.query(
        `INSERT INTO payment_events (id, provider, provider_event_id, event_type, status)
         VALUES ('90000000-0000-4000-8000-000000000010', 'demo', 'evt-001', 'payment.paid', 'PROCESSED')`,
      ),
      "23505",
    );

    await testPool.query(
      `INSERT INTO reviews (
         id, booking_id, business_id, branch_id, customer_id, overall_rating, status, updated_at
       ) VALUES (
         '90000000-0000-4000-8000-000000000011',
         '50000000-0000-4000-8000-000000000001',
         '20000000-0000-4000-8000-000000000001',
         '30000000-0000-4000-8000-000000000001',
         '40000000-0000-4000-8000-000000000001', 5, 'PUBLISHED', CURRENT_TIMESTAMP
       )`,
    );
    await expectPostgresError(
      testPool.query(
        `INSERT INTO reviews (
           id, booking_id, business_id, branch_id, customer_id, overall_rating, status, updated_at
         ) VALUES (
           '90000000-0000-4000-8000-000000000012',
           '50000000-0000-4000-8000-000000000001',
           '20000000-0000-4000-8000-000000000001',
           '30000000-0000-4000-8000-000000000001',
           '40000000-0000-4000-8000-000000000001', 4, 'PUBLISHED', CURRENT_TIMESTAMP
         )`,
      ),
      "23505",
    );
  });

  it("uses timestamptz, integer money, and immutable booking snapshots", async () => {
    const columns = await testPool.query<{
      column_name: string;
      data_type: string;
    }>(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'bookings'
         AND column_name IN ('start_at', 'total_minor')`,
    );
    const columnTypes = Object.fromEntries(
      columns.rows.map((column) => [column.column_name, column.data_type]),
    );
    const snapshot = await testPool.query<{
      service_name_snapshot: string;
      price_minor_snapshot: number;
    }>(
      `SELECT service_name_snapshot, price_minor_snapshot
       FROM booking_services
       WHERE booking_id = '50000000-0000-4000-8000-000000000001'`,
    );

    expect(columnTypes.start_at).toBe("timestamp with time zone");
    expect(columnTypes.total_minor).toBe("integer");
    expect(snapshot.rows[0]).toEqual({
      service_name_snapshot: "Classic Haircut",
      price_minor_snapshot: 150_000,
    });
  });
});
