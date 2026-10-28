/**
 * Unit — the old Hoo MCP issues no new keys (kimny 2026-10-22「畳む」・conductor (c)).
 *
 * The April MCP Registry listing sent visitors to mued.jp/connect, which made an API key for the
 * Cloudflare Worker (workers/hoo-mcp) and so let new people into the old MUEDial. The Worker is stopped
 * outside this repo; what this repo owns is the door: both key screens redirect, POST /api/mcp/api-key
 * is 410, and nothing in the app links to either screen. Revoking (DELETE) stays.
 *
 * ★next.config.ts is read as source text — only one test file may import it (see
 * tests/unit/plugin-bare-path-redirects.test.ts for the native-module failure on Linux CI).
 */
import { describe, it, expect, vi } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/middleware/with-auth", () => ({ resolveClerkUserId: vi.fn(async () => "user_test") }));
vi.mock("@/lib/utils/auth-helpers", () => ({ getUserIdFromClerkId: vi.fn(async () => "uuid-test") }));

const ROOT = process.cwd();

function redirectsIn(source: string): Array<{ source: string; destination: string; permanent: boolean }> {
  const re = /\{\s*source:\s*'([^']+)',\s*destination:\s*'([^']+)',\s*permanent:\s*(true|false)\s*,?\s*\}/g;
  return [...source.matchAll(re)].map((m) => ({ source: m[1], destination: m[2], permanent: m[3] === "true" }));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|json)$/.test(name) ? [path] : [];
  });
}

describe("★the old Hoo MCP issues no new keys", () => {
  it("POST /api/mcp/api-key is 410 (even for a signed-in user)", async () => {
    const { POST } = await import("@/app/api/mcp/api-key/route");
    const res = await POST();
    expect(res.status).toBe(410);
    expect((await res.json()).error).toMatch(/retired/);
  });

  it("both key screens redirect, temporarily (so it can be undone)", () => {
    const redirects = redirectsIn(readFileSync(join(ROOT, "next.config.ts"), "utf8"));
    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: "/connect", destination: "/", permanent: false },
        { source: "/connect/:path*", destination: "/", permanent: false },
        { source: "/dashboard/settings/mcp", destination: "/dashboard/settings", permanent: false },
      ])
    );
  });

  it("the screens themselves are gone and the sitemap no longer lists /connect", () => {
    expect(existsSync(join(ROOT, "app/connect"))).toBe(false);
    expect(existsSync(join(ROOT, "app/dashboard/settings/mcp"))).toBe(false);
    expect(readFileSync(join(ROOT, "app/sitemap.ts"), "utf8")).not.toContain("/connect");
  });

  // ★After the Worker was stopped (workers.dev disabled 2026-10-28): what is left pointing at it.
  it("the middleware no longer guards /connect (the redirect in next.config.ts runs first)", () => {
    const source = readFileSync(join(ROOT, "middleware.ts"), "utf8");
    expect(source).toContain('"/lobe(.*)"'); // the matcher list is still read here
    expect(source).not.toContain("/connect");
  });

  it("the app no longer calls the Worker, and its unused screen copy is gone", () => {
    expect(existsSync(join(ROOT, "app/api/mcp/test-connection"))).toBe(false);
    for (const locale of ["en", "ja"]) {
      const settings = JSON.parse(readFileSync(join(ROOT, `messages/${locale}.json`), "utf8")).settings;
      expect(settings.hoo, `${locale}: the settings namespace is still read here`).toBeDefined();
      expect(Object.keys(settings)).not.toContain("hooMcp");
      expect(Object.keys(settings)).not.toContain("mcp");
    }
  });

  it("llms.txt no longer offers Hoo MCP", () => {
    const source = readFileSync(join(ROOT, "app/llms.txt/route.ts"), "utf8");
    expect(source).toContain("## 運営会社"); // the file is the one that was read
    expect(source).not.toMatch(/hoo-mcp|Hoo MCP/i);
  });

  it("a redeploy cannot turn the public URL back on, and pushes do not deploy", () => {
    expect(readFileSync(join(ROOT, "workers/hoo-mcp/wrangler.toml"), "utf8")).toMatch(/^workers_dev = false$/m);
    const workflow = readFileSync(join(ROOT, ".github/workflows/deploy-hoo-mcp.yml"), "utf8");
    expect(workflow).toMatch(/^ {2}workflow_dispatch:$/m);
    expect(workflow).not.toMatch(/^ {2}push:/m);
    for (const file of ["workers/hoo-mcp/server.json", "workers/hoo-mcp/src/index.ts"]) {
      expect(readFileSync(join(ROOT, file), "utf8"), file).not.toContain("mued.jp/connect");
    }
  });

  it("nothing in app/ or components/ links to either screen", () => {
    const files = [...sourceFiles(join(ROOT, "app")), ...sourceFiles(join(ROOT, "components"))];
    expect(files.length).toBeGreaterThan(100); // the walk reached the tree
    const hits = files.filter((f) => /["'`]\/(connect|dashboard\/settings\/mcp)["'`/?]/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
