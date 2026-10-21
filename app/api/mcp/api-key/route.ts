/**
 * MCP API Key Management
 *
 * POST   — Retired (410): keys are no longer issued
 * DELETE — Revoke an existing API key
 * GET    — List active keys for the current user
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mcpApiKeys } from "@/db/schema/mcp-api-keys";
import { eq, and, isNull } from "drizzle-orm";
import { resolveClerkUserId } from "@/lib/middleware/with-auth";
import { getUserIdFromClerkId } from "@/lib/utils/auth-helpers";

// POST — no longer issues keys. ★The old Hoo MCP server is retired (kimny 2026-10-22「畳む」), so a new
// key would open nothing; 410 rather than 404 says the route is gone on purpose. Revoking (DELETE) and
// listing (GET) stay, so a holder of one of the remaining keys can still remove it.
export async function POST() {
  return NextResponse.json(
    { error: "Hoo MCP has been retired. New API keys are no longer issued." },
    { status: 410 }
  );
}

// DELETE — Revoke API key
export async function DELETE(request: NextRequest) {
  const clerkId = await resolveClerkUserId(request);
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let internalUserId: string;
  try {
    internalUserId = await getUserIdFromClerkId(clerkId);
  } catch (err) {
    const status = (err as { status?: number }).status === 404 ? 404 : 500;
    const error = status === 404 ? "User not found" : "Internal server error";
    return NextResponse.json({ error }, { status });
  }

  const body = await request.json().catch(() => ({}));
  const keyId = (body as { id?: string }).id;

  if (keyId) {
    // Revoke specific key
    await db
      .update(mcpApiKeys)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(mcpApiKeys.id, keyId), eq(mcpApiKeys.userId, internalUserId))
      );
  } else {
    // Revoke all active keys
    await db
      .update(mcpApiKeys)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(mcpApiKeys.userId, internalUserId),
          isNull(mcpApiKeys.revokedAt)
        )
      );
  }

  return NextResponse.json({ success: true });
}

// GET — List active keys
export async function GET(request: NextRequest) {
  const clerkId = await resolveClerkUserId(request);
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let internalUserId: string;
  try {
    internalUserId = await getUserIdFromClerkId(clerkId);
  } catch (err) {
    const status = (err as { status?: number }).status === 404 ? 404 : 500;
    const error = status === 404 ? "User not found" : "Internal server error";
    return NextResponse.json({ error }, { status });
  }

  const keys = await db
    .select({
      id: mcpApiKeys.id,
      prefix: mcpApiKeys.keyPrefix,
      name: mcpApiKeys.name,
      createdAt: mcpApiKeys.createdAt,
      lastUsedAt: mcpApiKeys.lastUsedAt,
    })
    .from(mcpApiKeys)
    .where(
      and(eq(mcpApiKeys.userId, internalUserId), isNull(mcpApiKeys.revokedAt))
    );

  return NextResponse.json({ success: true, data: { keys } });
}
