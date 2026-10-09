/**
 * The funnel collector's Resend gate (lib/funnel/resend-get.ts).
 *
 * ★WHY. 2026-10-09: the daily collector and its rerun both died on `audience … list 429`, and the data
 * branch was not published. The collector fired its Resend reads concurrently and one of them
 * (the welcome-mail paging) did not even check the status — a 429 there read as an empty page.
 *
 * ★WHAT THIS CAN AND CANNOT DO. Time is injected (a fake clock and a fake sleep), so these tests show
 * the spacing and the retry logic, not Resend's real limit. Whether the real run passes is only shown
 * by running the workflow.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPacedGet, retryWaitMs } from "@/lib/funnel/resend-get";

function harness(statuses: Array<number | { status: number; retryAfter?: string }>) {
  let clock = 0;
  const starts: number[] = [];
  const sleeps: number[] = [];
  const queue = statuses.slice();
  const fetchImpl = async () => {
    starts.push(clock);
    clock += 5; // a request takes a little time
    const next = queue.shift() ?? 200;
    const { status, retryAfter } = typeof next === "number" ? { status: next, retryAfter: undefined } : next;
    return new Response(status === 200 ? "{}" : "limited", {
      status,
      headers: retryAfter === undefined ? {} : { "retry-after": retryAfter },
    });
  };
  const sleep = async (ms: number) => {
    sleeps.push(ms);
    clock += ms;
  };
  return { starts, sleeps, fetchImpl, sleep, now: () => clock };
}

describe("paced Resend GET", () => {
  it("sends concurrent callers one at a time, at least minIntervalMs apart", async () => {
    const h = harness([]);
    const get = createPacedGet({ ...h, minIntervalMs: 250 });
    const responses = await Promise.all(Array.from({ length: 12 }, (_, i) => get(`https://x/${i}`)));
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(h.starts).toHaveLength(12);
    const gaps = h.starts.slice(1).map((t, i) => t - h.starts[i]);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(250);
    // ≤ 4 starts in any one second — far under the 10/s the 429 named.
    for (const t of h.starts) expect(h.starts.filter((u) => u >= t && u < t + 1000).length).toBeLessThanOrEqual(4);
  });

  it("without the gate the same 12 calls start in the same instant (the test can see the difference)", async () => {
    const h = harness([]);
    await Promise.all(Array.from({ length: 12 }, () => h.fetchImpl()));
    expect(Math.max(...h.starts) - Math.min(...h.starts)).toBeLessThan(250);
  });

  it("waits out a 429 and retries, honouring retry-after", async () => {
    const h = harness([{ status: 429, retryAfter: "3" }, 429, 200]);
    const retries: number[] = [];
    const get = createPacedGet({ ...h, minIntervalMs: 0, onRetry: (info) => retries.push(info.waitMs) });
    const r = await get("https://x/a");
    expect(r.status).toBe(200);
    expect(h.starts).toHaveLength(3);
    expect(retries).toEqual([3000, 2000]); // header first, then 1s·2^attempt
  });

  it("returns the 429 when the retries run out — it never turns a failed read into a success", async () => {
    const h = harness([429, 429, 429, 429, 429, 429]);
    const get = createPacedGet({ ...h, minIntervalMs: 0, maxRetries: 2 });
    const r = await get("https://x/a");
    expect(r.status).toBe(429);
    expect(r.ok).toBe(false);
    expect(h.starts).toHaveLength(3); // 1 try + 2 retries, then stop
  });

  it("does not retry other failures", async () => {
    const h = harness([500]);
    const get = createPacedGet({ ...h, minIntervalMs: 0 });
    expect((await get("https://x/a")).status).toBe(500);
    expect(h.starts).toHaveLength(1);
  });

  it("keeps serving after a request throws", async () => {
    const h = harness([]);
    let first = true;
    const get = createPacedGet({
      ...h,
      fetchImpl: async () => {
        if (first) {
          first = false;
          throw new Error("network");
        }
        return h.fetchImpl();
      },
    });
    const [a, b] = await Promise.allSettled([get("https://x/a"), get("https://x/b")]);
    expect(a.status).toBe("rejected");
    expect(b.status).toBe("fulfilled");
  });

  it("caps the wait and ignores a malformed retry-after", () => {
    expect(retryWaitMs("600", 0, 10_000)).toBe(10_000);
    expect(retryWaitMs("soon", 1, 10_000)).toBe(2000);
    expect(retryWaitMs(null, 0, 10_000)).toBe(1000);
    expect(retryWaitMs("-5", 2, 10_000)).toBe(4000);
  });
});

describe("the collector uses the gate for every Resend read", () => {
  const source = readFileSync(join(process.cwd(), "scripts/aggregate-plugin-funnel-daily.ts"), "utf8");

  it("still talks to Resend (the population is not empty)", () => {
    expect((source.match(/api\.resend\.com/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect((source.match(/resendGet\(/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it("has no direct fetch call left", () => {
    expect(source.match(/(^|[^A-Za-z.])fetch\(/gm) ?? []).toEqual([]);
  });

  it("checks the status of every read before parsing it", () => {
    const reads = (source.match(/await resendGet\(/g) ?? []).length;
    const checks = (source.match(/if \(!(r|listRes)\.ok\) throw/g) ?? []).length;
    expect(checks).toBe(reads);
  });
});
