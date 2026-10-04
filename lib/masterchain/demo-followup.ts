/** Pure cohort selection. A click is interest, not proof of a download or a person reading. */
export interface FollowupClick {
  email: string;
  clicked_links?: { url: string; clicks: number }[];
}
export interface FollowupContact { email: string; unsubscribed: boolean }
export interface FollowupEmail { to: string[]; subject: string; last_event: string }
export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export function isProductClick(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.hostname === "mued.jp" && /^\/(?:en\/|ja\/)?muedsp\/?$/.test(url.pathname);
  } catch { return false; }
}

export function selectDemoFollowup(input: {
  clicks: FollowupClick[]; contacts: FollowupContact[]; emails: FollowupEmail[]; excluded: string[];
}) {
  const excluded = new Set(input.excluded.map(normalizeEmail));
  const existingDemo = new Set<string>();
  for (const mail of input.emails) {
    const demo = /masterchain/i.test(mail.subject) && /demo|デモ|license|ライセンス|trial|試用/i.test(mail.subject);
    if (demo) mail.to.forEach(email => existingDemo.add(normalizeEmail(email)));
    if (["bounced", "complained", "suppressed"].includes(mail.last_event)) mail.to.forEach(email => excluded.add(normalizeEmail(email)));
  }
  const subscribed = new Set(input.contacts.filter(c => c.unsubscribed === false).map(c => normalizeEmail(c.email)));
  // Conflicting duplicate contacts must never turn an unsubscribe into permission.
  input.contacts.filter(c => c.unsubscribed !== false).forEach(c => excluded.add(normalizeEmail(c.email)));
  const allClicked = new Set(input.clicks.map(c => normalizeEmail(c.email)));
  const productClicked = new Set(input.clicks.filter(c => c.clicked_links?.some(l => l.clicks > 0 && isProductClick(l.url))).map(c => normalizeEmail(c.email)));
  const recipients = [...productClicked].filter(email => subscribed.has(email) && !excluded.has(email) && !existingDemo.has(email)).sort();
  return { recipients, counts: {
    allClicked: allClicked.size, productClicked: productClicked.size,
    existingDemo: [...productClicked].filter(e => existingDemo.has(e)).length,
    ineligible: [...productClicked].filter(e => !subscribed.has(e) || excluded.has(e)).length,
    eligible: recipients.length,
  } };
}

/** Fully exhaust a Resend list; refuse partial results and broken/repeated cursors. */
export async function listResendPages<T extends { id: string }>(
  get: (path: string) => Promise<unknown>, path: string,
): Promise<T[]> {
  const rows: T[] = [];
  const cursors = new Set<string>();
  let after = "";
  for (let page = 0; page < 500; page++) {
    const body = await get(`${path}${path.includes("?") ? "&" : "?"}limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`) as { data?: T[]; has_more?: boolean };
    if (!body || !Array.isArray(body.data) || typeof body.has_more !== "boolean") throw new Error("Invalid Resend list response");
    rows.push(...body.data);
    if (!body.has_more) return rows;
    const cursor = body.data.at(-1)?.id;
    if (!cursor || cursors.has(cursor)) throw new Error("Incomplete Resend pagination");
    cursors.add(cursor);
    after = cursor;
  }
  throw new Error("Resend pagination limit exceeded; no cohort produced");
}
