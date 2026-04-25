/**
 * MCP Tool Analytics — Structured Logging + GA4 Measurement Protocol
 *
 * Two layers:
 *   1. console.log structured JSON → CF Workers Logs (wrangler tail / dashboard)
 *   2. GA4 Measurement Protocol → GA4 reports (fire-and-forget via ctx.waitUntil)
 *
 * GA4 secrets are optional — if not set, only structured logs are emitted.
 */

// ========================================
// Types
// ========================================

export interface ToolCallLog {
  tool_name: string;
  tool_tier: 1 | 2 | 3;
  duration_ms: number;
  success: boolean;
  error_message?: string;
  clerk_id_prefix: string; // First 8 chars for privacy
  timestamp: string;
}

interface GA4Event {
  name: string;
  params: Record<string, string | number | boolean>;
}

interface GA4Env {
  GA4_MEASUREMENT_ID?: string;
  GA4_API_SECRET?: string;
}

// ========================================
// Tool → Tier Mapping
// ========================================

const TOOL_TIERS: Record<string, 1 | 2 | 3> = {
  // Tier 1: Core user data
  get_user_profile: 1,
  get_conversation_history: 1,
  get_hoo_context: 1,
  get_muedlobe_profile: 1,
  get_subscription_status: 1,
  save_conversation: 1,
  // Tier 2: MUEDial session management
  get_dial_session_status: 2,
  get_dial_chat_history: 2,
  get_dial_credit_balance: 2,
  get_dial_task_details: 2,
  get_dial_phase_and_actions: 2,
  // Tier 3: glasswerks services
  get_glasswerks_services: 3,
  submit_inquiry: 3,
  get_inquiry_status: 3,
  // Echovna: AI music composition (Phase 0, stateless)
  compose_from_concept: 1,
  evaluate_generation: 1,
  get_echovna_capability: 1,
};

export function getToolTier(toolName: string): 1 | 2 | 3 {
  return TOOL_TIERS[toolName] ?? 1;
}

// ========================================
// Structured Console Logging
// ========================================

export function logToolCall(log: ToolCallLog): void {
  console.log(
    JSON.stringify({
      type: "mcp_tool_call",
      ...log,
    })
  );
}

// ========================================
// GA4 Measurement Protocol
// ========================================

const GA4_ENDPOINT = "https://www.google-analytics.com/mp/collect";

/**
 * Send events to GA4 via Measurement Protocol.
 * Returns a Promise suitable for ctx.waitUntil().
 * Silently skips if GA4 secrets are not configured.
 */
export function sendGA4Events(
  env: GA4Env,
  clientId: string,
  events: GA4Event[]
): Promise<void> {
  if (!env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) {
    return Promise.resolve();
  }

  const url = `${GA4_ENDPOINT}?measurement_id=${env.GA4_MEASUREMENT_ID}&api_secret=${env.GA4_API_SECRET}`;

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      events,
    }),
  })
    .then(() => {})
    .catch(() => {});
}

/**
 * Build GA4 events for a tool call.
 * Always emits mcp_tool_call. Additionally emits specific events for inquiry tools.
 */
export function buildGA4Events(log: ToolCallLog): GA4Event[] {
  const events: GA4Event[] = [
    {
      name: "mcp_tool_call",
      params: {
        tool_name: log.tool_name,
        tool_tier: log.tool_tier,
        duration_ms: log.duration_ms,
        success: log.success,
      },
    },
  ];

  if (log.tool_name === "submit_inquiry" && log.success) {
    events.push({
      name: "mcp_inquiry_submitted",
      params: {
        tool_name: "submit_inquiry",
        duration_ms: log.duration_ms,
      },
    });
  }

  if (log.tool_name === "get_inquiry_status") {
    events.push({
      name: "mcp_inquiry_checked",
      params: {
        tool_name: "get_inquiry_status",
        success: log.success,
      },
    });
  }

  return events;
}
