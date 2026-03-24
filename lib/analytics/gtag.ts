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

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}
