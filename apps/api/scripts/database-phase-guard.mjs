const operation = process.argv[2] ?? "unknown";

console.log(
  `[bookflow] db:${operation} is registered correctly; Prisma schema and migrations are introduced in Phase 3.`,
);
