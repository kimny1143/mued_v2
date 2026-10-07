/**
 * GET /api/admin/license/owner-muedvox — kimny's own MUEDvox keyfile, downloaded once (see lib/muedvox/owner-key.ts).
 *
 * kimny 2026-10-07 「OKです」 via conductor (Tier 3); conductor's design OK, option (a): kimny opens this URL once while
 * signed in, and the file goes straight to his Mac. The key never passes through any session, chat, PR or log.
 * ★TEMPORARY: retired by the next PR once kimny has the file (status.md blocked_by).
 *
 * ★404 for EVERYONE who is not kimny signed in as admin — signed out and other admins included (no 401/403: the route does not admit it
 *   exists). Not in middleware's public or protected lists, so nothing redirects before this handler runs.
 * ★Cache-Control: no-store on every response, so no cache keeps the key.
 * ★The log line carries the order id only — never the keyfile, the signature or the owner's address.
 */
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/middleware/admin";
import { issueMuedvoxOwnerKey, OWNER_KEY_ALLOWED_USER_IDS, OWNER_KEY_FILE_NAME, OWNER_KEY_ORDER } from "@/lib/muedvox/owner-key";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const notFound = () => new Response("Not Found", { status: 404, headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" } });

export async function GET(): Promise<Response> {
  const { userId } = await auth();
  // kimny only (OWNER_KEY_ALLOWED_USER_IDS) AND the admin role — anyone else, including another admin, gets 404.
  if (!userId || !OWNER_KEY_ALLOWED_USER_IDS.includes(userId) || !(await isAdmin(userId))) return notFound();

  let email: string | undefined;
  try {
    const user = await (await clerkClient()).users.getUser(userId);
    email = user.primaryEmailAddress?.emailAddress ?? undefined;
  } catch {
    email = undefined;
  }
  if (!email) {
    logger.error("[owner-key] admin has no primary email — not issued", { order: OWNER_KEY_ORDER });
    return new Response("Internal Server Error", { status: 500, headers: NO_STORE });
  }

  const keyfile = issueMuedvoxOwnerKey(email);
  if (!keyfile) {
    // Signing key missing/invalid, or the issued key failed its own verification as MUEDvox: hand over nothing.
    logger.error("[owner-key] not issued — signing unavailable or the key did not verify as muedvox", { order: OWNER_KEY_ORDER });
    return new Response("Internal Server Error", { status: 500, headers: NO_STORE });
  }

  // warn, not info: logger.info is a no-op in production, and this is the one line that proves the route was used.
  logger.warn("[owner-key] MUEDvox owner key issued and downloaded", { order: OWNER_KEY_ORDER });
  return new Response(keyfile, {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${OWNER_KEY_FILE_NAME}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
