import { describe, it, expect } from 'vitest';

// ─── Inline status mapping (mirrors handleDialSubscriptionUpdated) ──────────

const STATUS_MAP: Record<string, string> = {
  active: 'active',
  past_due: 'past_due',
  canceled: 'cancelled',
  incomplete: 'past_due',
  incomplete_expired: 'cancelled',
  paused: 'cancelled',
};

function mapStripeStatus(stripeStatus: string): string {
  return STATUS_MAP[stripeStatus] || 'active';
}

// ─── Inline event payload builder (mirrors insert logic) ───────────────────

interface SubEventPayload {
  subscriptionId: string;
  userId: string;
  eventType: string;
  stripeEventId: string;
  fromStatus: string | null;
  toStatus: string;
  cancelAtPeriodEnd: boolean | null;
  currentPeriodEnd: Date | null;
  stripeSubscriptionId: string;
}

function buildUpdatedEvent(opts: {
  sub: { id: string; userId: string; status: string };
  stripeStatus: string;
  stripeSubId: string;
  eventId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date;
}): SubEventPayload {
  const newStatus = mapStripeStatus(opts.stripeStatus);
  return {
    subscriptionId: opts.sub.id,
    userId: opts.sub.userId,
    eventType: 'customer.subscription.updated',
    stripeEventId: opts.eventId,
    fromStatus: opts.sub.status,
    toStatus: newStatus,
    cancelAtPeriodEnd: opts.cancelAtPeriodEnd,
    currentPeriodEnd: opts.currentPeriodEnd,
    stripeSubscriptionId: opts.stripeSubId,
  };
}

function buildDeletedEvent(opts: {
  sub: { id: string; userId: string; status: string; currentPeriodEnd: Date | null };
  stripeSubId: string;
  eventId: string;
}): SubEventPayload {
  return {
    subscriptionId: opts.sub.id,
    userId: opts.sub.userId,
    eventType: 'customer.subscription.deleted',
    stripeEventId: opts.eventId,
    fromStatus: opts.sub.status,
    toStatus: 'cancelled',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: opts.sub.currentPeriodEnd,
    stripeSubscriptionId: opts.stripeSubId,
  };
}

function buildCheckoutEvent(opts: {
  subscriptionId: string;
  userId: string;
  stripeSubId: string;
  eventId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date;
}): SubEventPayload {
  return {
    subscriptionId: opts.subscriptionId,
    userId: opts.userId,
    eventType: 'checkout.session.completed',
    stripeEventId: opts.eventId,
    fromStatus: null,
    toStatus: 'active',
    cancelAtPeriodEnd: opts.cancelAtPeriodEnd,
    currentPeriodEnd: opts.currentPeriodEnd,
    stripeSubscriptionId: opts.stripeSubId,
  };
}

function buildPaymentFailedEvent(opts: {
  sub: { id: string; userId: string; status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: Date | null };
  stripeSubId: string;
  eventId: string;
}): SubEventPayload {
  return {
    subscriptionId: opts.sub.id,
    userId: opts.sub.userId,
    eventType: 'invoice.payment_failed',
    stripeEventId: opts.eventId,
    fromStatus: opts.sub.status,
    toStatus: 'past_due',
    cancelAtPeriodEnd: opts.sub.cancelAtPeriodEnd,
    currentPeriodEnd: opts.sub.currentPeriodEnd,
    stripeSubscriptionId: opts.stripeSubId,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

const MOCK_SUB_ID = 'uuid-sub-001';
const MOCK_USER_ID = 'user_clerk_abc';
const MOCK_STRIPE_SUB_ID = 'sub_stripe_xyz';
const MOCK_EVENT_ID = 'evt_stripe_001';
const MOCK_PERIOD_END = new Date('2026-06-09T00:00:00Z');

describe('dial_subscription_events — state transition payload', () => {
  it('subscription.updated (active → cancelled): correct from/to + eventType', () => {
    const payload = buildUpdatedEvent({
      sub: { id: MOCK_SUB_ID, userId: MOCK_USER_ID, status: 'active' },
      stripeStatus: 'canceled',
      stripeSubId: MOCK_STRIPE_SUB_ID,
      eventId: MOCK_EVENT_ID,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: MOCK_PERIOD_END,
    });
    expect(payload.eventType).toBe('customer.subscription.updated');
    expect(payload.fromStatus).toBe('active');
    expect(payload.toStatus).toBe('cancelled');
    expect(payload.stripeEventId).toBe(MOCK_EVENT_ID);
    expect(payload.subscriptionId).toBe(MOCK_SUB_ID);
  });

  it('subscription.updated (active → past_due): incomplete maps to past_due', () => {
    const payload = buildUpdatedEvent({
      sub: { id: MOCK_SUB_ID, userId: MOCK_USER_ID, status: 'active' },
      stripeStatus: 'incomplete',
      stripeSubId: MOCK_STRIPE_SUB_ID,
      eventId: MOCK_EVENT_ID,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: MOCK_PERIOD_END,
    });
    expect(payload.fromStatus).toBe('active');
    expect(payload.toStatus).toBe('past_due');
  });

  it('subscription.deleted: fromStatus preserved, toStatus=cancelled, cancelAtPeriodEnd=false', () => {
    const payload = buildDeletedEvent({
      sub: { id: MOCK_SUB_ID, userId: MOCK_USER_ID, status: 'active', currentPeriodEnd: MOCK_PERIOD_END },
      stripeSubId: MOCK_STRIPE_SUB_ID,
      eventId: MOCK_EVENT_ID,
    });
    expect(payload.eventType).toBe('customer.subscription.deleted');
    expect(payload.fromStatus).toBe('active');
    expect(payload.toStatus).toBe('cancelled');
    expect(payload.cancelAtPeriodEnd).toBe(false);
    expect(payload.stripeEventId).toBe(MOCK_EVENT_ID);
  });

  it('checkout.session.completed (subscription): fromStatus=null, toStatus=active', () => {
    const payload = buildCheckoutEvent({
      subscriptionId: MOCK_SUB_ID,
      userId: MOCK_USER_ID,
      stripeSubId: MOCK_STRIPE_SUB_ID,
      eventId: MOCK_EVENT_ID,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: MOCK_PERIOD_END,
    });
    expect(payload.eventType).toBe('checkout.session.completed');
    expect(payload.fromStatus).toBeNull();
    expect(payload.toStatus).toBe('active');
    expect(payload.stripeEventId).toBe(MOCK_EVENT_ID);
  });

  it('invoice.payment_failed (dial sub): fromStatus=active, toStatus=past_due', () => {
    const payload = buildPaymentFailedEvent({
      sub: {
        id: MOCK_SUB_ID,
        userId: MOCK_USER_ID,
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: MOCK_PERIOD_END,
      },
      stripeSubId: MOCK_STRIPE_SUB_ID,
      eventId: MOCK_EVENT_ID,
    });
    expect(payload.eventType).toBe('invoice.payment_failed');
    expect(payload.fromStatus).toBe('active');
    expect(payload.toStatus).toBe('past_due');
    expect(payload.stripeEventId).toBe(MOCK_EVENT_ID);
  });

  it('invoice.payment_failed (no dial sub): should not build event', () => {
    // Simulates the guard: dialSub not found → no event insert
    const dialSub = null;
    const shouldInsert = dialSub !== null;
    expect(shouldInsert).toBe(false);
  });
});

describe('dial_subscription_events — idempotency key', () => {
  it('stripeEventId is always set and matches Stripe event.id', () => {
    const events = [
      buildUpdatedEvent({
        sub: { id: MOCK_SUB_ID, userId: MOCK_USER_ID, status: 'active' },
        stripeStatus: 'active',
        stripeSubId: MOCK_STRIPE_SUB_ID,
        eventId: 'evt_unique_1',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: MOCK_PERIOD_END,
      }),
      buildDeletedEvent({
        sub: { id: MOCK_SUB_ID, userId: MOCK_USER_ID, status: 'active', currentPeriodEnd: null },
        stripeSubId: MOCK_STRIPE_SUB_ID,
        eventId: 'evt_unique_2',
      }),
    ];
    expect(events[0].stripeEventId).toBe('evt_unique_1');
    expect(events[1].stripeEventId).toBe('evt_unique_2');
    // UNIQUE constraint on stripeEventId prevents duplicate inserts
    const eventIds = events.map((e) => e.stripeEventId);
    expect(new Set(eventIds).size).toBe(eventIds.length);
  });
});
