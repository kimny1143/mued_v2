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

/**
 * Track MUEDial player playback issues — the detection layer for the decode/playback
 * failure class (Yuu incident 2026-06-11). Every prior playback failure was user-reported;
 * this surfaces decode timeouts / errors / player stalls to GA4 so we catch them first.
 */
export function trackDialPlaybackIssue(params: {
  issue: "decode_timeout" | "decode_error" | "player_stall";
  takeLabel?: string;
  stemKey?: string;
  takeCount?: number;
  elapsedMs?: number;
}): void {
  trackEvent({
    action: "dial_playback_issue",
    params: {
      issue: params.issue,
      ...(params.takeLabel ? { take_label: params.takeLabel } : {}),
      ...(params.stemKey ? { stem_key: params.stemKey } : {}),
      ...(params.takeCount != null ? { take_count: params.takeCount } : {}),
      ...(params.elapsedMs != null ? { elapsed_ms: params.elapsedMs } : {}),
    },
  });
}

/**
 * CTA の遷移先。★呼び出し側が明示する（推測しない）。
 *
 * 以前は `product === "muedial" ? "external_site" : "app_store"` で決めていた。
 *
 * ★2026-08-05 実測（call site 全 11 件）。★「何件 直った」は静的には確定しないので、
 *   リテラルと変数を分けて書く（product課 指摘 2026-08-05。当初この節は「7件」と
 *   単一の数だけ書いており、★その数は後から引用される durable な記述だった）:
 *
 *     リテラル 9 件 … ★変 7 / 同 2
 *       app_store → signup / internal_page / external_site  … 5件
 *       external_site → internal_page ("muedial" だが同一サイト内) … 1件
 *       app_store → internal_page ("muedsp")                … 1件
 *       external_site のまま ("muedial" の LP から dial へ)  … 2件
 *     変数 2 件   … ★旧値は実行時の値に依存＝静的には決まらない
 *       `product`（app-store-button）→ 新 app_store
 *       `plugin` （muedsat の DL フォーム）→ 新 download_form
 *
 * ★誤りは両方向に出ていた（App Store へ行かないのに `app_store` / 同一サイト内なのに
 *   `external_site`）。∴ 「片側に寄っていた」ではなく「導出できないものを導出していた」。
 * ★`product` の文字列から遷移先は導けない（`waitlist_from_readiness` は MUEDial ですらない）。
 * ★`startsWith("muedial")` に変えるだけでは、その1件が救われない。
 * ★そして変数 2 件は、そもそも静的に直しようがなかった——★必須化すると
 *   呼び出し側が明示するので、推測が要らなくなる。これが「数を直す」より効いた点。
 */
export type CtaDestination =
  | "app_store"      // iOS/Android のストアへ出る
  | "external_site"  // 別ホストの web へ出る（dial.mued.jp 等）
  | "internal_page"  // 同一サイト内の別ページ
  | "signup"         // サインアップ / サインイン
  | "download_link"  // 直接インストーラーをダウンロード
  | "download_form"; // その場の DL フォーム（ページ遷移しない）

/**
 * Track CTA button clicks on the landing page.
 *
 * ★`destination` は必須。既定値を置くと、置いた値が「判定不能」を実在する正しい値として
 * 確定させ、出力が健全に見える（本日 org で潰した型）。★必須にすることで、
 * 新しい call site を足した人に tsc が必ず判断を求める。
 */
export function trackCtaClick(
  product: string,
  location: string,
  destination: CtaDestination
): void {
  trackEvent({
    action: "cta_click",
    params: {
      product,
      location,
      destination,
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
  trigger: "masthead" | "empty_state",
  sourceComponent: "hoo_masthead" | "session_ledger"
): void {
  trackEvent({
    action: "muednote_to_dial_cta_click",
    params: {
      source_component: sourceComponent,
      destination: "/dial",
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

/** Track research beta waitlist page view */
export function trackWaitlistView(): void {
  trackEvent({ action: 'waitlist_view', params: { page: 'muedial_waitlist', funnel: 'research_beta' } });
}

/** Track waitlist form submission */
export function trackWaitlistSubmit(params: {
  dtm_years: string | null;
  has_pain_point: boolean;
  from?: string;
}): void {
  trackEvent({
    action: 'waitlist_submit',
    params: {
      dtm_years: params.dtm_years ?? 'none',
      has_pain_point: params.has_pain_point,
      from: params.from ?? 'direct',
      funnel: 'research_beta',
    },
  });
}

/** Track successful waitlist registration */
export function trackWaitlistSuccess(params: { qualified: boolean }): void {
  trackEvent({
    action: 'waitlist_success',
    params: { qualified_waitlist: params.qualified, funnel: 'research_beta' },
  });
}

/** Track readiness diagnostic page view */
export function trackReadinessStart(): void {
  trackEvent({ action: 'readiness_start', params: { funnel: 'research_beta' } });
}

/** Track readiness diagnostic completion */
export function trackReadinessComplete(params: {
  score: number;
  qualified: boolean;
  has_email: boolean;
}): void {
  trackEvent({
    action: 'readiness_complete',
    params: {
      score: params.score,
      qualified_waitlist: params.qualified,
      has_email: params.has_email,
      funnel: 'research_beta',
    },
  });
}

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}
