import { describe, expect, it } from "vitest";
import { emailSchema, localDateSchema } from "./index.js";

describe("shared validation schemas", () => {
  it("normalizes an email address", () => {
    expect(emailSchema.parse("  PERSON@Example.COM ")).toBe(
      "person@example.com",
    );
  });

  it("rejects a timestamp where a local date is required", () => {
    expect(localDateSchema.safeParse("2026-09-17T00:00:00Z").success).toBe(
      false,
    );
  });
});
