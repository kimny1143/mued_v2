/**
 * MCP API Key Management
 *
 * POST   — Generate a new API key (returns raw key once)
 * DELETE — Revoke an existing API key
 * GET    — List active keys for the current user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { mcpApiKeys } from "@/db/schema/mcp-api-keys";
import { users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateRawKey(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return (
    "mcp_" + Array.from(bytes, (b) => chars[b % chars.length]).join("")
  );
}

async function resolveInternalUserId(clerkId: string): Promise<string | null> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return rows[0]?.id ?? null;
}

// POST — Generate new API key
export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalUserId = await resolveInternalUserId(clerkId);
  if (!internalUserId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Revoke any existing active keys (one active key per user)
  await db
    .update(mcpApiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(mcpApiKeys.userId, internalUserId), isNull(mcpApiKeys.revokedAt))
    );

  // Generate new key
  const rawKey = generateRawKey();
  const keyHash = await sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 8); // "mcp_xxxx"

  await db.insert(mcpApiKeys).values({
    userId: internalUserId,
    keyPrefix,
    keyHash,
    name: "default",
  });

  return NextResponse.json({
    success: true,
    data: {
      key: rawKey, // Only returned once
      prefix: keyPrefix,
    },
  });
}

// DELETE — Revoke API key
export async function DELETE(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalUserId = await resolveInternalUserId(clerkId);
  if (!internalUserId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalUserId = await resolveInternalUserId(clerkId);
  if (!internalUserId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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
