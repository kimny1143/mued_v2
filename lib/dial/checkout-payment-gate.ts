/**
 * §③ Stripe payment-status gate for MUEDial checkouts (Tier3 Phase 0).
 *
 * Problem: the webhook treated `checkout.session.completed` as unconditionally PAID and had no
 * async-payment handlers. Card payments settle synchronously (payment_status='paid' on completed),
 * but **delayed payment methods** (e.g. bank transfer / some wallets) fire `completed` while
 * `payment_status` is still `unpaid` — and the real outcome arrives later as
 * `checkout.session.async_payment_succeeded` / `_failed`. Marking such a session PAID on `completed`
 * would let an unpaid session consume RoEx COGS (the deferred-billing model's core risk).
 *
 * This pure helper maps a Stripe checkout event to the dial paid-effect action so the decision is
 * unit-testable without a DB / Stripe client.
 */

export type DialCheckoutAction =
  | 'commit' // mark paid + run completion (purchases→completed, session→paid, bonus)
  | 'defer' // completed but not yet paid (delayed method) — wait for async_payment_succeeded
  | 'fail' // delayed payment failed — mark session/purchases failed
  | 'ignore'; // not a dial checkout event we act on

/** Minimal shape we read from a Stripe.Checkout.Session (keeps the helper dependency-free). */
export interface CheckoutSessionLike {
  metadata?: Record<string, string> | null;
  payment_status?: string | null;
}

/**
 * Decide what a dial checkout event should do, given its type and the session's payment_status.
 *
 * - `checkout.session.completed` + payment_status='paid'  → commit  (card: settles immediately)
 * - `checkout.session.completed` + payment_status!='paid' → defer   (delayed method, await async)
 * - `checkout.session.async_payment_succeeded`            → commit  (delayed payment cleared)
 * - `checkout.session.async_payment_failed`               → fail    (delayed payment failed)
 * - non-dial session, or any other event type            → ignore
 */
export function dialCheckoutAction(
  eventType: string,
  session: CheckoutSessionLike,
): DialCheckoutAction {
  if (session.metadata?.service !== 'dial') return 'ignore';

  switch (eventType) {
    case 'checkout.session.completed':
      return session.payment_status === 'paid' ? 'commit' : 'defer';
    case 'checkout.session.async_payment_succeeded':
      return 'commit';
    case 'checkout.session.async_payment_failed':
      return 'fail';
    default:
      return 'ignore';
  }
}
