/**
 * GA4 Custom Event Tracking
 *
 * UTM parameters (utm_source, utm_medium, utm_campaign) are automatically
 * captured by gtag.js on page_view. This module adds custom event tracking
 * for CTA clicks to measure the Threads → LP → CTA funnel.
 */

type GtagEvent = {
  action: string;
  params?: Record<string, string | number | boolean>;
};

function isGtagAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

export function trackEvent({ action, params }: GtagEvent): void {
  if (!isGtagAvailable()) return;
  window.gtag("event", action, params);
}

/** Track CTA button clicks on the landing page */
export function trackCtaClick(product: string, location: string): void {
  trackEvent({
    action: "cta_click",
    params: {
      product,
      location,
      destination: product === "muedial" ? "external_site" : "app_store",
    },
  });
}

/** Track MCP /connect funnel steps */
export function trackMcpConnect(
  step:
    | "key_generated"
    | "config_copied"
    | "test_success"
    | "test_failure"
    | "step_viewed"
    | "host_selected",
  params?: Record<string, string | number>
): void {
  trackEvent({
    action: `mcp_connect_${step}`,
    params: { funnel: "mcp_connect", ...params },
  });
}

/** Track inquiry-related events (client-side, for future UI-based inquiries) */
export function trackInquiry(
  action: "submitted" | "status_checked",
  params?: Record<string, string>
): void {
  trackEvent({
    action: `mcp_inquiry_${action}`,
    params: { funnel: "mcp_inquiry", ...params },
  });
}

/**
 * Track Stripe checkout funnel: fired when redirect to Stripe is imminent.
 * Returns a Promise that resolves after the event fires (or after 500ms timeout),
 * ensuring the GA4 hit completes before the page navigates away.
 */
export function trackCheckoutView(
  checkoutType: "subscription" | "credit_pack",
  item: string
): Promise<void> {
  return new Promise((resolve) => {
    if (!isGtagAvailable()) {
      resolve();
      return;
    }
    const timeout = setTimeout(resolve, 500);
    window.gtag("event", "checkout_view", {
      checkout_type: checkoutType,
      item,
      funnel: "dial_checkout",
      event_callback: () => {
        clearTimeout(timeout);
        resolve();
      },
    });
  });
}

/** Track MUEDnote dashboard CTA clicks that lead to MUEDial */
export function trackMuednoteToDialCta(
  trigger: "buy_more" | "no_sub" | "masthead" | "empty_state",
  sourceComponent: "credits_ledger" | "hoo_masthead" | "session_ledger"
): void {
  trackEvent({
    action: "muednote_to_dial_cta_click",
    params: {
      source_component: sourceComponent,
      destination: trigger === "empty_state" ? "/dial" : "/dial/pricing",
      trigger,
      funnel: "muednote_to_dial",
    },
  });
}

/** Track Stripe checkout abandonment: fired when user returns via cancel_url */
export function trackCheckoutAbandoned(
  checkoutType: "subscription" | "credit_pack",
  item: string
): void {
  trackEvent({
    action: "checkout_abandoned",
    params: { checkout_type: checkoutType, item, funnel: "dial_checkout" },
  });
}

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}
