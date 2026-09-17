import { describe, expect, it } from "vitest";
import { QUEUE_NAMES } from "./queue-names.js";

describe("queue names", () => {
  it("uses stable kebab-case names for cross-process queues", () => {
    expect(QUEUE_NAMES.bookingReminders).toBe("booking-reminders");
    expect(QUEUE_NAMES.notifications).toBe("notifications");
  });
});
