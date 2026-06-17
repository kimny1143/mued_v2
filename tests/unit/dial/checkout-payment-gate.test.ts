import { describe, it, expect } from 'vitest';
import { dialCheckoutAction } from '@/lib/dial/checkout-payment-gate';

const dial = (payment_status?: string | null) => ({ metadata: { service: 'dial' }, payment_status });

describe('dialCheckoutAction — §③ Stripe payment-status gate', () => {
  it('commits a dial checkout.session.completed only when payment_status=paid (card)', () => {
    expect(dialCheckoutAction('checkout.session.completed', dial('paid'))).toBe('commit');
  });

  it('DEFERS a dial checkout.session.completed that is not yet paid (delayed method) — no paid effects', () => {
    // The §③ bug: this used to be treated as PAID, letting an unpaid session consume RoEx COGS.
    expect(dialCheckoutAction('checkout.session.completed', dial('unpaid'))).toBe('defer');
    expect(dialCheckoutAction('checkout.session.completed', dial('no_payment_required'))).toBe('defer');
    expect(dialCheckoutAction('checkout.session.completed', dial(null))).toBe('defer');
    expect(dialCheckoutAction('checkout.session.completed', dial(undefined))).toBe('defer');
  });

  it('commits on async_payment_succeeded (delayed payment cleared)', () => {
    // Stripe sends the session with payment_status=paid here; commit regardless of the field too.
    expect(dialCheckoutAction('checkout.session.async_payment_succeeded', dial('paid'))).toBe('commit');
    expect(dialCheckoutAction('checkout.session.async_payment_succeeded', dial('unpaid'))).toBe('commit');
  });

  it('fails on async_payment_failed (delayed payment failed)', () => {
    expect(dialCheckoutAction('checkout.session.async_payment_failed', dial('unpaid'))).toBe('fail');
  });

  it('ignores non-dial sessions for every event type', () => {
    const nonDial = { metadata: { service: 'lesson' }, payment_status: 'paid' };
    expect(dialCheckoutAction('checkout.session.completed', nonDial)).toBe('ignore');
    expect(dialCheckoutAction('checkout.session.async_payment_succeeded', nonDial)).toBe('ignore');
    expect(dialCheckoutAction('checkout.session.async_payment_failed', nonDial)).toBe('ignore');
    expect(dialCheckoutAction('checkout.session.completed', { metadata: null, payment_status: 'paid' })).toBe('ignore');
  });

  it('ignores unrelated event types even for dial sessions', () => {
    expect(dialCheckoutAction('checkout.session.expired', dial('unpaid'))).toBe('ignore');
    expect(dialCheckoutAction('payment_intent.payment_failed', dial('paid'))).toBe('ignore');
  });
});
