/**
 * Unit — the collector's "welcome email未達" check reads reached (delivered/opened/clicked), not
 * delivered alone (conductor 2026-09-27). Positive control: it still fires on a real miss.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { isReached, welcomeReachAnomalies, welcomeReachCheckHealthy } from "@/lib/funnel/welcome-reach";

const KEYS = ["muedsat", "muedlim", "muedrive"] as const;
const reachedOf = (events: Record<(typeof KEYS)[number], string[]>) =>
  Object.fromEntries(KEYS.map((k) => [k, events[k].filter(isReached).length])) as Record<(typeof KEYS)[number], number>;

describe("welcome reach check", () => {
  it("★is quiet on the day that used to misfire: every sign-up's mail was opened or clicked", () => {
    // Shape of run 36323824708 (UTC 2026-09-26): db 4/6/2, and the mails reached but were not `delivered`.
    const events = {
      muedsat: ["clicked", "clicked", "clicked", "clicked"],
      muedlim: ["clicked", "clicked", "opened", "clicked", "delivered", "clicked"],
      muedrive: ["clicked", "delivered"],
    };
    expect(welcomeReachAnomalies(KEYS, { muedsat: 4, muedlim: 6, muedrive: 2 }, reachedOf(events))).toEqual([]);
  });

  it("★still fires when a mail really did not reach (positive control)", () => {
    const events = { muedsat: ["clicked", "bounced"], muedlim: ["sent"], muedrive: [] };
    expect(welcomeReachAnomalies(KEYS, { muedsat: 2, muedlim: 1, muedrive: 1 }, reachedOf(events))).toEqual([
      "muedsat: db_net_new(2) > email_reached(1) — welcome email未達の疑い",
      "muedlim: db_net_new(1) > email_reached(0) — welcome email未達の疑い",
      "muedrive: db_net_new(1) > email_reached(0) — welcome email未達の疑い",
    ]);
  });

  it("counts only delivered / opened / clicked as reached", () => {
    for (const e of ["delivered", "opened", "clicked"]) expect(isReached(e)).toBe(true);
    for (const e of ["bounced", "complained", "sent", "queued", "delivery_delayed", "", undefined, null]) {
      expect(isReached(e)).toBe(false);
    }
  });

  it("the runtime self-check passes on the shipped code", () => {
    expect(welcomeReachCheckHealthy()).toBe(true);
  });

  it("★the collector's check reads email_reached, and email_delivered keeps its meaning", () => {
    const src = readFileSync(join(process.cwd(), "scripts", "aggregate-plugin-funnel-daily.ts"), "utf8");
    expect(src).toContain("welcomeReachAnomalies(");
    expect(src).toContain("welcomeReachCheckHealthy()");
    expect(src).not.toMatch(/dbNetNew\[sh\]\s*>\s*shelfEmail\[sh\]\.delivered/);
    expect(src).toMatch(/if \(e\.last_event === "delivered"\) shelfEmail\[sh\]\.delivered\+\+/);
    expect(src).toContain("email_reached: shelfEmail[k].reached");
  });
});

describe("welcome_ja_reached (conductor 2026-09-27: same defect as email_delivered)", () => {
  const src = readFileSync(join(process.cwd(), "scripts", "aggregate-plugin-funnel-daily.ts"), "utf8");

  it("★is emitted beside welcome_ja_delivered, which keeps its meaning", () => {
    expect(src).toContain("welcome_ja_reached: welcomeJaReached");
    expect(src).toContain("welcome_ja_delivered: welcomeJaDelivered");
    expect(src).toMatch(/if \(e\.last_event === "delivered"\) n\+\+/);
    expect(src).toMatch(/if \(isReached\(e\.last_event\)\) r\+\+/);
  });

  it("★goes null with welcome_ja_delivered when the JA detector self-check fails — never 0", () => {
    expect(src).toMatch(/welcomeJaDelivered = null;[^\n]*\n\s*welcomeJaReached = null;/);
  });
});
