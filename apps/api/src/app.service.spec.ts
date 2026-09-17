import { describe, expect, it } from "vitest";
import { AppService } from "./app.service.js";

describe("AppService", () => {
  it("reports the API bootstrap status", () => {
    expect(new AppService().getBootstrapStatus()).toMatchObject({
      application: "bookflow-api",
      status: "ok",
    });
  });
});
