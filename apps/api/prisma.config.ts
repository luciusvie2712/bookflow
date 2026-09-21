import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig, env } from "prisma/config";

const isProduction = process.env.NODE_ENV === "production";
const candidates = [
  new URL("./.env", import.meta.url),
  new URL("../../.env", import.meta.url),
  ...(isProduction
    ? []
    : [
        new URL("./.env.example", import.meta.url),
        new URL("../../.env.example", import.meta.url),
      ]),
];

for (const candidate of candidates) {
  const path = fileURLToPath(candidate);
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
