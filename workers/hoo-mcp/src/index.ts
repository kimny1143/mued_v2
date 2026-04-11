/**
 * Hoo MCP Server — Cloudflare Workers
 *
 * Remote MCP server implementing Streamable HTTP transport.
 * Provides 14 tools for Hoo context, user data, MUEDial sessions, and glasswerks services.
 *
 * Endpoints:
 *   POST /mcp   — MCP JSON-RPC over HTTP (stateless)
 *   GET  /       — Health check
 *   OPTIONS /*   — CORS preflight
 *
 * Auth: Clerk JWT Bearer token → clerk_id auto-injected into tools
 */

import { neon } from "@neondatabase/serverless";
import { authenticateRequest } from "./auth";
import {
  TOOL_DEFINITIONS,
  getUserProfile,
  getConversationHistory,
  getHooContext,
  getMuedlobeProfile,
  getSubscriptionStatus,
  saveConversation,
  getGlasswerksServices,
} from "./tools";
import {
  getDialSessionStatus,
  getDialChatHistory,
  getDialCreditBalance,
  getDialTaskDetails,
  getDialPhaseAndActions,
} from "./tools-dial";
import { submitInquiry, getInquiryStatus } from "./tools-glasswerks";
import {
  logToolCall,
  buildGA4Events,
  sendGA4Events,
  getToolTier,
} from "./analytics";

// ========================================
// Environment
// ========================================

export interface Env {
  DATABASE_URL: string;
  ALLOWED_ORIGINS: string;
  MUED_API_URL: string;
  INTERNAL_API_KEY: string;
  GA4_MEASUREMENT_ID?: string;
  GA4_API_SECRET?: string;
}

// ========================================
// CORS
// ========================================

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowedPatterns = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());

  let allowOrigin = "";
  for (const pattern of allowedPatterns) {
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
      );
      if (regex.test(origin)) {
        allowOrigin = origin;
        break;
      }
    } else if (origin === pattern) {
      allowOrigin = origin;
      break;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin || allowedPatterns[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

// ========================================
// MCP JSON-RPC Handler
// ========================================

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function jsonRpcError(
  id: string | number | null | undefined,
  code: number,
  message: string
): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function jsonRpcResult(
  id: string | number | null | undefined,
  result: unknown
): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

/** Dispatch a single tool call (no logging — pure execution). */
async function executeToolCall(
  toolName: string,
  toolArgs: Record<string, unknown>,
  clerkId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: import("@neondatabase/serverless").NeonQueryFunction<any, any>,
  env: Env
): Promise<{ result: unknown; error?: string }> {
  switch (toolName) {
    case "get_user_profile":
      return { result: await getUserProfile(sql, clerkId) };

    case "get_conversation_history":
      return {
        result: await getConversationHistory(sql, clerkId, {
          limit: toolArgs.limit as number | undefined,
          include_messages: toolArgs.include_messages as boolean | undefined,
        }),
      };

    case "get_hoo_context":
      return {
        result: await getHooContext(sql, clerkId, {
          include_recent_messages: toolArgs.include_recent_messages as
            | number
            | undefined,
        }),
      };

    case "get_muedlobe_profile":
      return { result: await getMuedlobeProfile(sql, clerkId) };

    case "get_subscription_status":
      return { result: await getSubscriptionStatus(sql, clerkId) };

    case "save_conversation":
      return {
        result: await saveConversation(
          sql,
          clerkId,
          {
            messages: toolArgs.messages as Array<{
              role: string;
              content: string;
            }>,
            title: toolArgs.title as string | undefined,
          },
          {
            MUED_API_URL: env.MUED_API_URL,
            INTERNAL_API_KEY: env.INTERNAL_API_KEY,
          }
        ),
      };

    // ── Tier 3: glasswerks Creator Services ──

    case "get_glasswerks_services":
      return {
        result: getGlasswerksServices({
          category: toolArgs.category as string | undefined,
        }),
      };

    case "submit_inquiry":
      return {
        result: await submitInquiry(
          sql,
          clerkId,
          {
            service_type: toolArgs.service_type as string,
            budget_range: toolArgs.budget_range as string,
            description: toolArgs.description as string,
            urgency: toolArgs.urgency as string | undefined,
            language: toolArgs.language as string | undefined,
          },
          {
            MUED_API_URL: env.MUED_API_URL,
            INTERNAL_API_KEY: env.INTERNAL_API_KEY,
          }
        ),
      };

    case "get_inquiry_status":
      return {
        result: await getInquiryStatus(sql, clerkId, {
          inquiry_id: toolArgs.inquiry_id as string | undefined,
        }),
      };

    // ── Tier 2: MUEDial Session Management ──

    case "get_dial_session_status":
      return {
        result: await getDialSessionStatus(sql, clerkId, {
          session_id: toolArgs.session_id as string,
        }),
      };

    case "get_dial_chat_history":
      return {
        result: await getDialChatHistory(sql, clerkId, {
          session_id: toolArgs.session_id as string,
          limit: toolArgs.limit as number | undefined,
        }),
      };

    case "get_dial_credit_balance":
      return { result: await getDialCreditBalance(sql, clerkId) };

    case "get_dial_task_details":
      return {
        result: await getDialTaskDetails(sql, clerkId, {
          task_id: toolArgs.task_id as string,
          include_fx_settings: toolArgs.include_fx_settings as
            | boolean
            | undefined,
        }),
      };

    case "get_dial_phase_and_actions":
      return {
        result: await getDialPhaseAndActions(sql, clerkId, {
          session_id: toolArgs.session_id as string,
        }),
      };

    default:
      return { result: null, error: `Unknown tool: ${toolName}` };
  }
}

interface HandleMcpResult {
  response: JsonRpcResponse;
  /** GA4 events to send via ctx.waitUntil (empty if none). */
  ga4Promise: Promise<void>;
}

async function handleMcpRequest(
  rpcReq: JsonRpcRequest,
  clerkId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: import("@neondatabase/serverless").NeonQueryFunction<any, any>,
  env: Env
): Promise<HandleMcpResult> {
  const noop = Promise.resolve();

  switch (rpcReq.method) {
    case "initialize":
      return {
        response: jsonRpcResult(rpcReq.id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "hoo-mcp", version: "1.0.0" },
        }),
        ga4Promise: noop,
      };

    case "notifications/initialized":
      return { response: jsonRpcResult(rpcReq.id, {}), ga4Promise: noop };

    case "tools/list":
      return {
        response: jsonRpcResult(rpcReq.id, { tools: TOOL_DEFINITIONS }),
        ga4Promise: noop,
      };

    case "tools/call": {
      const toolName = (rpcReq.params as { name: string })?.name;
      const toolArgs =
        ((rpcReq.params as { arguments?: Record<string, unknown> })
          ?.arguments as Record<string, unknown>) ?? {};

      const startTime = Date.now();
      let success = true;
      let errorMessage: string | undefined;

      try {
        const { result, error } = await executeToolCall(
          toolName,
          toolArgs,
          clerkId,
          sql,
          env
        );

        if (error) {
          // Unknown tool
          const log = {
            tool_name: toolName,
            tool_tier: getToolTier(toolName),
            duration_ms: Date.now() - startTime,
            success: false,
            error_message: error,
            clerk_id_prefix: clerkId.slice(0, 8),
            timestamp: new Date().toISOString(),
          };
          logToolCall(log);

          return {
            response: jsonRpcError(rpcReq.id, -32601, error),
            ga4Promise: sendGA4Events(
              env,
              clerkId.slice(0, 8),
              buildGA4Events(log)
            ),
          };
        }

        const durationMs = Date.now() - startTime;
        const log = {
          tool_name: toolName,
          tool_tier: getToolTier(toolName),
          duration_ms: durationMs,
          success: true,
          clerk_id_prefix: clerkId.slice(0, 8),
          timestamp: new Date().toISOString(),
        };
        logToolCall(log);

        return {
          response: jsonRpcResult(rpcReq.id, result),
          ga4Promise: sendGA4Events(
            env,
            clerkId.slice(0, 8),
            buildGA4Events(log)
          ),
        };
      } catch (err) {
        success = false;
        errorMessage =
          err instanceof Error ? err.message : "Tool execution failed";

        const log = {
          tool_name: toolName,
          tool_tier: getToolTier(toolName),
          duration_ms: Date.now() - startTime,
          success,
          error_message: errorMessage,
          clerk_id_prefix: clerkId.slice(0, 8),
          timestamp: new Date().toISOString(),
        };
        logToolCall(log);

        return {
          response: jsonRpcError(rpcReq.id, -32603, errorMessage),
          ga4Promise: sendGA4Events(
            env,
            clerkId.slice(0, 8),
            buildGA4Events(log)
          ),
        };
      }
    }

    case "ping":
      return { response: jsonRpcResult(rpcReq.id, {}), ga4Promise: noop };

    default:
      return {
        response: jsonRpcError(
          rpcReq.id,
          -32601,
          `Method not found: ${rpcReq.method}`
        ),
        ga4Promise: noop,
      };
  }
}

// ========================================
// Worker Entry
// ========================================

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cors = corsHeaders(request, env);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health check + Server Card (SEP-1649)
    if (request.method === "GET") {
      const url = new URL(request.url);

      // MCP Server Card — enables registry scanner discovery
      if (url.pathname === "/.well-known/mcp/server-card.json") {
        return new Response(
          JSON.stringify({
            version: "1.0.0",
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "Hoo MCP",
              version: "1.0.0",
              description:
                "AI music production assistant — audio profiling, AI mixing sessions, and service inquiries.",
            },
            transport: [{ type: "streamable-http", url: "/mcp" }],
            capabilities: { tools: {} },
          }),
          { headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // Default health check
      return new Response(
        JSON.stringify({
          name: "hoo-mcp",
          version: "1.0.0",
          status: "ok",
          transport: "streamable-http",
        }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // MCP endpoint — POST only
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: cors,
      });
    }

    // Authenticate via API key hash
    const sql = neon(env.DATABASE_URL);
    const clerkId = await authenticateRequest(request, sql, env);
    if (!clerkId) {
      return new Response(
        JSON.stringify(
          jsonRpcError(null, -32000, "Unauthorized: invalid or missing API key")
        ),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Parse JSON-RPC
    let rpcReq: JsonRpcRequest;
    try {
      rpcReq = (await request.json()) as JsonRpcRequest;
    } catch {
      return new Response(
        JSON.stringify(jsonRpcError(null, -32700, "Parse error")),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    if (rpcReq.jsonrpc !== "2.0" || !rpcReq.method) {
      return new Response(
        JSON.stringify(
          jsonRpcError(rpcReq.id, -32600, "Invalid JSON-RPC request")
        ),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Handle
    try {
      const { response, ga4Promise } = await handleMcpRequest(rpcReq, clerkId, sql, env);
      // Send GA4 events in the background — does not block the response
      ctx.waitUntil(ga4Promise);
      return new Response(JSON.stringify(response), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return new Response(
        JSON.stringify(jsonRpcError(rpcReq.id, -32603, message)),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }
  },
};

export default worker;
