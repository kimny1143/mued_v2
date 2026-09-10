/**
 * ★An API rejection from Resend must not be reported as a completed write.
 *
 * ## What was wrong (freee measured 2026-09-10; conductor relayed; verified here)
 *
 * `resend@6.12.4` does NOT throw when the API rejects a call. Its `fetchRequest` catches the non-ok
 * response and ★RETURNS a value — from the installed `node_modules/resend/dist/index.cjs`:
 *
 *     if (!response.ok) { … return { data: null, error: JSON.parse(rawError), headers … }; }
 *
 * ★So `try { await resend.contacts.create(…); return true } catch { return false }` reports SUCCESS
 * for every failure the API itself reports. The `catch` only ever sees transport-level throws. ★The
 * bug is not a wrong boolean — it is a wrong boolean ★nobody could see was wrong.
 *
 * ## Why these three call sites and not "some audience code"
 *
 *   · `addMasterchainContact("buyers")` — ★the $69 purchaser's list add, from the FastSpring webhook.
 *     A paid customer silently missing from the buyers list.
 *   · `addPluginSubscriber` — the free-download lead capture; its caller raises an operator alert on
 *     `!listCaptured`, so a false `true` ★silences the alert as well as losing the lead.
 *   · `unsubscribePluginContact` — ★the worst of the three. Someone clicks one-click unsubscribe, the
 *     update is rejected, and the old code answered "done". ★A consent withdrawal reported as taken
 *     while the mail keeps arriving is not a best-effort miss.
 *
 * ★Resend's 1,000-contact free tier does NOT block creates (only broadcasts — freee, first-hand), so
 * hitting the cap would not have surfaced this either. Nothing was going to make it visible.
 *
 * ## The shape of the old tests, which is the part worth remembering
 *
 * `tests/unit/muedsat/audience.test.ts` already had "a Resend failure is swallowed and returns
 * false" — and it passed throughout, because it mocked a THROWN error. ★It tested the branch that
 * cannot happen and left the one that does uncovered. A test named for the right property can still
 * be pointed at the wrong mechanism.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/utils/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const create = vi.fn();
const update = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ contacts: { create, update } })),
}));

/** What the SDK actually resolves when the API says no. */
const REJECTION = { data: null, error: { name: "validation_error", message: "Contact already exists" } };
/** …and when it says yes. */
const ACCEPTED = { data: { id: "con_1" }, error: null };

const ENV = { ...process.env };
beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.RESEND_MASTERCHAIN_BUYERS_AUDIENCE_ID = "aud_buyers";
  process.env.MUEDSP_AUDIENCE_ID = "aud_muedsp";
  process.env.RESEND_MUEDSAT_AUDIENCE_ID = "aud_muedsp";
  vi.resetModules();
});
afterEach(() => {
  process.env = { ...ENV };
  vi.clearAllMocks();
});

describe("Resend API rejection ≠ success", () => {
  it("★addMasterchainContact('buyers') returns false when the API rejects — the $69 buyer's list add", async () => {
    const { addMasterchainContact } = await import("@/lib/masterchain/audience");
    create.mockResolvedValueOnce(REJECTION);
    await expect(addMasterchainContact("buyers", { email: "buyer@example.com" })).resolves.toBe(false);
  });

  it("★addMasterchainContact('buyers') still returns true when the API accepts", async () => {
    // ★Without this the assertion above would also pass against a function that always returns false —
    //   "rejects a rejection" and "distinguishes them" are different claims.
    const { addMasterchainContact } = await import("@/lib/masterchain/audience");
    create.mockResolvedValueOnce(ACCEPTED);
    await expect(addMasterchainContact("buyers", { email: "buyer@example.com" })).resolves.toBe(true);
  });

  it("★addPluginSubscriber returns false when the API rejects — a false true also silences its alert", async () => {
    const { addPluginSubscriber } = await import("@/lib/plugins/audience");
    create.mockResolvedValueOnce(REJECTION);
    await expect(addPluginSubscriber("muedsat", { email: "lead@example.com" })).resolves.toBe(false);
  });

  it("★addPluginSubscriber returns true when the API accepts", async () => {
    const { addPluginSubscriber } = await import("@/lib/plugins/audience");
    create.mockResolvedValueOnce(ACCEPTED);
    await expect(addPluginSubscriber("muedsat", { email: "lead@example.com" })).resolves.toBe(true);
  });

  it("★★unsubscribePluginContact returns false when the API rejects — a withdrawal is not 'best-effort'", async () => {
    const { unsubscribePluginContact } = await import("@/lib/plugins/audience");
    update.mockResolvedValueOnce(REJECTION);
    await expect(unsubscribePluginContact("muedsat", "leaver@example.com")).resolves.toBe(false);
  });

  it("★unsubscribePluginContact returns true when the API accepts", async () => {
    const { unsubscribePluginContact } = await import("@/lib/plugins/audience");
    update.mockResolvedValueOnce(ACCEPTED);
    await expect(unsubscribePluginContact("muedsat", "leaver@example.com")).resolves.toBe(true);
  });

  it("★a THROWN error still returns false — the old behaviour is not regressed", async () => {
    const { addMasterchainContact } = await import("@/lib/masterchain/audience");
    create.mockRejectedValueOnce(new Error("network down"));
    await expect(addMasterchainContact("buyers", { email: "buyer@example.com" })).resolves.toBe(false);
  });
});

/**
 * ★The per-function tests above pin the three sites that exist TODAY. This pins the RULE, so a
 * fourth site added next month cannot reintroduce the silence — the same reason the SQL shape guard
 * scans the repo instead of naming one file.
 */
describe("every Resend contacts write reads `error`", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".next", ".git"].includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.ts$/.test(e.name)) files.push(p);
    }
  };
  walk(join(".", "lib"));

  it("★no call site DISCARDS the result of contacts.create/update", () => {
    // ★Assert the population before asserting over it: a walk that matched nothing passes vacuously.
    expect(files.length).toBeGreaterThan(50);

    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/\bawait\s+\w+\.contacts\.(create|update)\(/g)) {
        // ★THE PREDICATE IS "IS THE RESULT DISCARDED", NOT "IS IT DESTRUCTURED". The first version of
        //   this check demanded `const { error } = await …` and so flagged
        //   lib/marketing/audience-sync.ts — which captures the result and reads `created.error` a few
        //   lines down, with a written reason for not using `?.`. ★That file was CORRECT and the
        //   detector was wrong: two valid shapes exist, and only one of them was in the pattern.
        //   ★Measured before narrowing, not asserted after.
        const lineStart = src.lastIndexOf("\n", m.index!) + 1;
        const beforeOnLine = src.slice(lineStart, m.index!);
        // A discarded result is a statement that STARTS with `await` — nothing binds it.
        if (!/[=(]\s*$/.test(beforeOnLine)) {
          offenders.push(`${f}: result of contacts.${m[1]} is discarded — a rejection cannot be seen`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
