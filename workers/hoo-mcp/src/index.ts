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

// ========================================
// Environment
// ========================================

export interface Env {
  DATABASE_URL: string;
  ALLOWED_ORIGINS: string;
  MUED_API_URL: string;
  INTERNAL_API_KEY: string;
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

async function handleMcpRequest(
  rpcReq: JsonRpcRequest,
  clerkId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: import("@neondatabase/serverless").NeonQueryFunction<any, any>,
  env: Env
): Promise<JsonRpcResponse> {

  switch (rpcReq.method) {
    case "initialize":
      return jsonRpcResult(rpcReq.id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "hoo-mcp", version: "1.0.0" },
      });

    case "notifications/initialized":
      // Client notification, no response needed for notifications
      // but since we're stateless HTTP, we return an empty result
      return jsonRpcResult(rpcReq.id, {});

    case "tools/list":
      return jsonRpcResult(rpcReq.id, { tools: TOOL_DEFINITIONS });

    case "tools/call": {
      const toolName = (rpcReq.params as { name: string })?.name;
      const toolArgs =
        ((rpcReq.params as { arguments?: Record<string, unknown> })
          ?.arguments as Record<string, unknown>) ?? {};

      switch (toolName) {
        case "get_user_profile":
          return jsonRpcResult(
            rpcReq.id,
            await getUserProfile(sql, clerkId)
          );

        case "get_conversation_history":
          return jsonRpcResult(
            rpcReq.id,
            await getConversationHistory(sql, clerkId, {
              limit: toolArgs.limit as number | undefined,
              include_messages: toolArgs.include_messages as
                | boolean
                | undefined,
            })
          );

        case "get_hoo_context":
          return jsonRpcResult(
            rpcReq.id,
            await getHooContext(sql, clerkId, {
              include_recent_messages: toolArgs.include_recent_messages as
                | number
                | undefined,
            })
          );

        case "get_muedlobe_profile":
          return jsonRpcResult(
            rpcReq.id,
            await getMuedlobeProfile(sql, clerkId)
          );

        case "get_subscription_status":
          return jsonRpcResult(
            rpcReq.id,
            await getSubscriptionStatus(sql, clerkId)
          );

        case "save_conversation":
          return jsonRpcResult(
            rpcReq.id,
            await saveConversation(sql, clerkId, {
              messages: toolArgs.messages as Array<{
                role: string;
                content: string;
              }>,
              title: toolArgs.title as string | undefined,
            }, {
              MUED_API_URL: env.MUED_API_URL,
              INTERNAL_API_KEY: env.INTERNAL_API_KEY,
            })
          );

        // ── Tier 3: glasswerks Creator Services ──

        case "get_glasswerks_services":
          return jsonRpcResult(
            rpcReq.id,
            getGlasswerksServices({
              category: toolArgs.category as string | undefined,
            })
          );

        case "submit_inquiry":
          return jsonRpcResult(
            rpcReq.id,
            await submitInquiry(sql, clerkId, {
              service_type: toolArgs.service_type as string,
              budget_range: toolArgs.budget_range as string,
              description: toolArgs.description as string,
              urgency: toolArgs.urgency as string | undefined,
              language: toolArgs.language as string | undefined,
            }, {
              MUED_API_URL: env.MUED_API_URL,
              INTERNAL_API_KEY: env.INTERNAL_API_KEY,
            })
          );

        case "get_inquiry_status":
          return jsonRpcResult(
            rpcReq.id,
            await getInquiryStatus(sql, clerkId, {
              inquiry_id: toolArgs.inquiry_id as string | undefined,
            })
          );

        // ── Tier 2: MUEDial Session Management ──

        case "get_dial_session_status":
          return jsonRpcResult(
            rpcReq.id,
            await getDialSessionStatus(sql, clerkId, {
              session_id: toolArgs.session_id as string,
            })
          );

        case "get_dial_chat_history":
          return jsonRpcResult(
            rpcReq.id,
            await getDialChatHistory(sql, clerkId, {
              session_id: toolArgs.session_id as string,
              limit: toolArgs.limit as number | undefined,
            })
          );

        case "get_dial_credit_balance":
          return jsonRpcResult(
            rpcReq.id,
            await getDialCreditBalance(sql, clerkId)
          );

        case "get_dial_task_details":
          return jsonRpcResult(
            rpcReq.id,
            await getDialTaskDetails(sql, clerkId, {
              task_id: toolArgs.task_id as string,
              include_fx_settings: toolArgs.include_fx_settings as boolean | undefined,
            })
          );

        case "get_dial_phase_and_actions":
          return jsonRpcResult(
            rpcReq.id,
            await getDialPhaseAndActions(sql, clerkId, {
              session_id: toolArgs.session_id as string,
            })
          );

        default:
          return jsonRpcError(rpcReq.id, -32601, `Unknown tool: ${toolName}`);
      }
    }

    case "ping":
      return jsonRpcResult(rpcReq.id, {});

    default:
      return jsonRpcError(
        rpcReq.id,
        -32601,
        `Method not found: ${rpcReq.method}`
      );
  }
}

// ========================================
// Worker Entry
// ========================================

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health check
    if (request.method === "GET") {
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
      const response = await handleMcpRequest(rpcReq, clerkId, sql, env);
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
