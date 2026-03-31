/**
 * Hoo MCP Server — Cloudflare Workers
 *
 * Remote MCP server implementing Streamable HTTP transport.
 * Provides 3 tools for accessing Hoo context and user data.
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
} from "./tools";

// ========================================
// Environment
// ========================================

export interface Env {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  ALLOWED_ORIGINS: string;
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
  env: Env
): Promise<JsonRpcResponse> {
  const sql = neon(env.DATABASE_URL);

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

    // Authenticate
    const clerkId = await authenticateRequest(request, env);
    if (!clerkId) {
      return new Response(
        JSON.stringify(
          jsonRpcError(null, -32000, "Unauthorized: invalid or missing Bearer token")
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
      const response = await handleMcpRequest(rpcReq, clerkId, env);
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
