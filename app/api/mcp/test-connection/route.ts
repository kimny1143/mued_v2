/**
 * MCP Connection Test
 *
 * POST — Test connectivity to the remote Hoo MCP Worker.
 * Verifies the user has an active API key, then hits the Worker health endpoint.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { mcpApiKeys } from "@/db/schema/mcp-api-keys";
import { users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const MCP_SERVER_URL = "https://hoo-mcp.glasswerkskimny.workers.dev";

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve internal user ID
  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  const internalUserId = userRows[0]?.id;
  if (!internalUserId) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  // Get active API key hash to verify it exists (we can't recover the raw key)
  const activeKeys = await db
    .select({ id: mcpApiKeys.id, keyHash: mcpApiKeys.keyHash })
    .from(mcpApiKeys)
    .where(
      and(eq(mcpApiKeys.userId, internalUserId), isNull(mcpApiKeys.revokedAt))
    )
    .limit(1);

  if (activeKeys.length === 0) {
    return NextResponse.json(
      { success: false, error: "No active API key" },
      { status: 400 }
    );
  }

  // Test the Worker health endpoint (doesn't require auth)
  try {
    const res = await fetch(MCP_SERVER_URL, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: `Worker returned ${res.status}`,
      });
    }

    const data = await res.json();
    if (data.status === "ok" && data.name === "hoo-mcp") {
      return NextResponse.json({
        success: true,
        server: {
          name: data.name,
          version: data.version,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: "Unexpected response from Worker",
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: "Cannot reach MCP server",
    });
  }
}
