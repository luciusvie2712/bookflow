export const DOMAIN_EVENT_NAMES = {
  bookingCreated: "booking.created",
  bookingConfirmed: "booking.confirmed",
  queueTicketCalled: "queue.ticket.called",
  paymentSucceeded: "payment.succeeded",
} as const;

export type DomainEventName =
  (typeof DOMAIN_EVENT_NAMES)[keyof typeof DOMAIN_EVENT_NAMES];

export type DomainEvent<TPayload extends Readonly<Record<string, unknown>>> =
  Readonly<{
    id: string;
    name: DomainEventName;
    occurredAt: string;
    version: 1;
    payload: TPayload;
  }>;
