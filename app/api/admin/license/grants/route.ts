/**
 * /api/admin/license/grants — issue and list time-limited license keys for testers (lib/plugins/license-grants.ts).
 *
 *   POST { email, product: "muedvox", days | minutes, reason } → 201 { grant }   (the record, never the key)
 *   GET  ?email=<address>                                       → 200 { grants }  (records for that address)
 *
 * ★404 for EVERYONE who is not kimny signed in as admin — signed out and other admins included (no 401/403: the
 *   route does not admit it exists). Same rule as the one-off owner key (#1245).
 * ★The key is never in a response, a log line or a mail: the recipient gets it from their portal, signed in with
 *   the address it was issued to.
 * ★Cache-Control: no-store on every response.
 */
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/middleware/admin";
import { createGrant, GRANT_ISSUER_USER_IDS, listGrantsForEmail, parseGrantRequest } from "@/lib/plugins/license-grants";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const notFound = () => new Response("Not Found", { status: 404, headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" } });
const json = (body: unknown, status: number) => Response.json(body, { status, headers: NO_STORE });

/** The signed-in issuer's Clerk user id, or null for everyone else. */
async function issuer(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId || !GRANT_ISSUER_USER_IDS.includes(userId) || !(await isAdmin(userId))) return null;
  return userId;
}

export async function POST(request: Request): Promise<Response> {
  const userId = await issuer();
  if (!userId) return notFound();

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "the body must be JSON" }, 400); }
  const parsed = parseGrantRequest(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  let grant;
  try {
    grant = await createGrant(parsed.value, userId);
  } catch {
    // The table is missing (migration 0064 not applied) or the DB refused the row. Nothing was handed out.
    logger.error("[license-grant] not recorded — the insert failed (is migration 0064 applied?)", { product: parsed.value.product.key });
    return json({ error: "the grant could not be recorded; no key was issued" }, 500);
  }
  if (!grant) {
    logger.error("[license-grant] not issued — signing unavailable or the key failed its own check", { product: parsed.value.product.key });
    return json({ error: "the key could not be issued" }, 500);
  }
  // warn, not info: logger.info is a no-op in production, and this is the line that says a key went out.
  // The order ref and the expiry only — never the keyfile, never the recipient's address.
  logger.warn("[license-grant] issued", { orderRef: grant.orderRef, product: parsed.value.product.key, expiresAt: grant.expiresAt });
  return json({ grant }, 201);
}

export async function GET(request: Request): Promise<Response> {
  const userId = await issuer();
  if (!userId) return notFound();
  const email = new URL(request.url).searchParams.get("email") ?? "";
  if (!email.trim()) return json({ error: "email is required" }, 400);
  try {
    return json({ grants: await listGrantsForEmail(email) }, 200);
  } catch {
    logger.error("[license-grant] list failed (is migration 0064 applied?)");
    return json({ error: "the records could not be read" }, 500);
  }
}
