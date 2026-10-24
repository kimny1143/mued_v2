/**
 * The public, unauthenticated endpoints named in the 2026-10-22 security memo (Chief, via conductor): each one is
 * rate-limited, either in the route or in the shared handler it calls. The limiter itself (and its in-memory
 * fallback for when Upstash does not answer) is tested in tests/unit/middleware/rate-limit.test.ts.
 */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockRateLimit = vi.fn();
vi.mock("@/lib/middleware/rate-limit", () => ({ rateLimit: (...a: unknown[]) => mockRateLimit(...a) }));
const mockQuery = vi.fn();
vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: mockQuery }) }) }) }) },
}));
vi.mock("@/lib/utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const src = (path: string) => readFileSync(path, "utf8");

// route → the file that holds its limit
const LIMITED = [
  ["app/api/muedlim/subscribe/route.ts", "lib/plugins/subscribe-handler.ts"],
  ["app/api/muedsat/subscribe/route.ts", "lib/plugins/subscribe-handler.ts"],
  ["app/api/muedrive/subscribe/route.ts", "lib/plugins/subscribe-handler.ts"],
  ["app/api/masterchain/demo/route.ts", "lib/masterchain/demo-handler.ts"],
  ["app/api/muedvox/demo/route.ts", "lib/masterchain/demo-handler.ts"],
  ["app/api/masterchain/trial/route.ts", "lib/masterchain/trial-handler.ts"],
  ["app/api/masterchain/interest/route.ts", "lib/masterchain/interest-handler.ts"],
  ["app/api/advisory/slots/route.ts", "app/api/advisory/slots/route.ts"],
] as const;

describe("★every public form named in the memo is rate-limited", () => {
  it.each(LIMITED)("%s → %s", (route, holder) => {
    if (route !== holder) {
      const handler = holder.replace(/^lib\//, "@/lib/").replace(/\.ts$/, "");
      expect(src(route)).toContain(`from "${handler}"`);
    }
    expect(src(holder)).toMatch(/\b(rateLimit|checkRateLimit)\(/);
  });

  it("cryomix/poc does no work in production: it answers 403 before reading the body", () => {
    const route = src("app/api/cryomix/poc/route.ts");
    const guard = route.indexOf("process.env.NODE_ENV === 'production'");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(route.indexOf("request.json()"));
  });
});

describe("advisory/slots", () => {
  beforeEach(() => {
    mockRateLimit.mockReset();
    mockQuery.mockReset();
  });

  it("★over the limit: 429 and the DB is not queried", async () => {
    mockRateLimit.mockResolvedValue(NextResponse.json({ error: "Too Many Requests" }, { status: 429 }));
    const { GET } = await import("@/app/api/advisory/slots/route");
    const res = await GET(new NextRequest("http://localhost/api/advisory/slots"));
    expect(res.status).toBe(429);
    expect(mockRateLimit).toHaveBeenCalledWith(expect.anything(), "api");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("under the limit: the slots are returned", async () => {
    mockRateLimit.mockResolvedValue(null);
    const start = new Date("2026-11-01T01:00:00Z");
    mockQuery.mockResolvedValue([{ id: "s1", startTime: start, endTime: new Date(start.getTime() + 3_600_000) }]);
    const { GET } = await import("@/app/api/advisory/slots/route");
    const res = await GET(new NextRequest("http://localhost/api/advisory/slots"));
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).toContain("2026-11-01T01:00:00.000Z");
  });
});
