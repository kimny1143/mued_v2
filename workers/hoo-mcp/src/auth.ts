/**
 * MCP API Key Authentication for CF Workers
 *
 * Verifies long-lived API keys by SHA-256 hash lookup against the database.
 * Returns the user's Clerk ID for tool operations.
 */

import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { Env } from "./index";

type Row = Record<string, unknown>;

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Authenticate request using MCP API key.
 * Returns clerk_id on success, null on failure.
 *
 * Flow: Bearer token → SHA-256 hash → DB lookup → user_id → clerk_id
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SQL = NeonQueryFunction<any, any>;

export async function authenticateRequest(
  request: Request,
  sql: SQL,
  _env: Env
): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token.startsWith("mcp_")) return null;

  const keyHash = await sha256(token);

  // Look up key hash, join with users to get clerk_id
  const rows = (await sql`
    SELECT u.clerk_id, k.id as key_id
    FROM mcp_api_keys k
    JOIN users u ON u.id = k.user_id
    WHERE k.key_hash = ${keyHash} AND k.revoked_at IS NULL
    LIMIT 1
  `) as Row[];

  if (rows.length === 0) return null;

  // Update last_used_at (fire-and-forget)
  sql`UPDATE mcp_api_keys SET last_used_at = NOW() WHERE id = ${rows[0].key_id}`.catch(
    () => {}
  );

  return rows[0].clerk_id as string;
}
