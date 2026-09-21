import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function loadWorkerEnvironmentFiles(): void {
  const isProduction = process.env.NODE_ENV === "production";
  const candidates = [
    new URL("../../.env", import.meta.url),
    new URL("../../../../.env", import.meta.url),
    ...(isProduction
      ? []
      : [
          new URL("../../.env.example", import.meta.url),
          new URL("../../../../.env.example", import.meta.url),
        ]),
  ];

  for (const candidate of candidates) {
    const path = fileURLToPath(candidate);
    if (existsSync(path)) {
      process.loadEnvFile(path);
    }
  }
}
