import { describe, expect, it, vi } from "vitest";
import { BookFlowApiClient } from "./client.js";

describe("BookFlowApiClient", () => {
  it("unwraps a successful API envelope", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ data: { status: "ok" }, requestId: "req-1" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    const client = new BookFlowApiClient({
      baseUrl: "https://api.example.test/",
      fetchImplementation,
    });

    await expect(client.get<{ status: string }>("/health")).resolves.toEqual({
      status: "ok",
    });
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });
});
