export const QUEUE_NAMES = {
  analytics: "analytics",
  bookingReminders: "booking-reminders",
  cleanup: "cleanup",
  email: "email",
  notifications: "notifications",
  payments: "payments",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
