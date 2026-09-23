import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { CHECKOUT_TAG_NAMES } from "@/lib/masterchain/fastspring-checkout";
import {
  eventState,
  formatFastspringEventTags,
  isEntryPoint,
  parseLimit,
  summarizeError,
  SKIPPED_TEST_MARKER,
  type SelectedFastspringEvent,
} from "../../scripts/read-fastspring-event-tags";

// Import the real exported marker with all route dependencies isolated from DB/env/services.
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/schema", () => ({ webhookEvents: {} }));
vi.mock("next/server", () => ({ NextResponse: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/utils/logger", () => ({ logger: {} }));
vi.mock("@/lib/masterchain/fastspring-signature", () => ({
  verifyFastspringSignature: vi.fn(), FASTSPRING_SIGNATURE_HEADER: "X-FS-Signature",
}));
vi.mock("@/lib/masterchain/fastspring-webhook", () => ({ handleFastspringOrderCompleted: vi.fn() }));
import { SKIPPED_TEST_MARKER as ROUTE_SKIPPED_TEST_MARKER } from "@/app/api/webhooks/fastspring/route";

const fixture = (overrides: Partial<SelectedFastspringEvent> = {}): SelectedFastspringEvent => ({
  event_id: "fixture-event-1",
  type: "order.completed",
  status: "processing",
  completed: true,
  error_message: SKIPPED_TEST_MARKER,
  created_at: "2026-09-23 12:00:00",
  live: false,
  tags_type: null,
  tag_flags: null,
  ...overrides,
});

describe("read-fastspring-event-tags state", () => {
  it.each([
    { status: "processing", completed: true, error_message: SKIPPED_TEST_MARKER, expected: "skipped (terminal)" },
    { status: "processing", completed: false, error_message: SKIPPED_TEST_MARKER, expected: "stuck (processing, not completed — the current route never leaves this; legacy row or another writer)" },
    { status: "processing", completed: false, error_message: null, expected: "stuck (processing, not completed — the current route never leaves this; legacy row or another writer)" },
    { status: "processed", completed: true, error_message: SKIPPED_TEST_MARKER, expected: "processed" },
    { status: "failed", completed: true, error_message: SKIPPED_TEST_MARKER, expected: "failed" },
    // Legacy terminal rows written before completedAt was used are not stuck.
    { status: "processed", completed: false, error_message: null, expected: "processed" },
    { status: "failed", completed: false, error_message: null, expected: "failed" },
    { status: "processing", completed: true, error_message: "different marker", expected: "processing (completed, unexpected marker)" },
    { status: "processing", completed: true, error_message: null, expected: "processing (completed, unexpected marker)" },
    { status: "unrecognized", completed: true, error_message: SKIPPED_TEST_MARKER, expected: "unknown" },
  ])("$status / completed=$completed / marker=$error_message → $expected", ({ expected, ...overrides }) => {
    const row = fixture(overrides);
    expect(eventState(row)).toBe(expected);
    expect(formatFastspringEventTags([row]).split("\n").filter((line) => line.startsWith("state:")))
      .toEqual([`state: ${expected}`]);
  });
});

describe("read-fastspring-event-tags formatting", () => {
  it("pins the script's literal to the route's exported skip marker", () => {
    expect(SKIPPED_TEST_MARKER).toBe(ROUTE_SKIPPED_TEST_MARKER);
  });

  it("reports no rows without inventing an event", () => {
    expect(formatFastspringEventTags([])).toBe("rows: 0 — no fastspring webhook event recorded");
  });

  it("reports missing tags and all absent checkout names", () => {
    const output = formatFastspringEventTags([fixture()]);
    expect(output).toContain("tags: MISSING");
    expect(output).toContain(`absent CHECKOUT_TAG_NAMES: ${CHECKOUT_TAG_NAMES.join(", ")}`);
    expect(output).toContain('event_id: "fixture-event-1"');
    expect(output).toContain('type: "order.completed"');
    expect(output).toContain('status: "processing"');
    expect(output).toContain("skipped_test: true");
    expect(output).toContain("created_at (UTC): 2026-09-23 12:00:00");
    expect(output).toContain("live: false");
  });

  it("lists present keys, empty flags, and only the absent contract names", () => {
    const output = formatFastspringEventTags([fixture({
      tags_type: "object",
      tag_flags: { gaClientId: false, eula_version: false, marketingConsent: true, utmSource: true, extra: true },
    })]);
    expect(output).toContain('tags: "eula_version"=empty, "extra"=non-empty, "gaClientId"=empty, "marketingConsent"=non-empty, "utmSource"=non-empty');
    expect(output).toContain("absent CHECKOUT_TAG_NAMES: utmCampaign, utmContent, utmMedium, utmTerm");
  });

  it("accepts only tag flags, never raw tag values, and never prints raw error messages", () => {
    type FormatterRow = Parameters<typeof formatFastspringEventTags>[0][number];
    expectTypeOf<FormatterRow["tag_flags"]>().toEqualTypeOf<Record<string, boolean> | null>();
    expectTypeOf<Extract<keyof FormatterRow, "tags">>().toEqualTypeOf<never>();
    const sentinel = "SECRET-VALUE-DO-NOT-PRINT";
    const output = formatFastspringEventTags([fixture({
      tags_type: "object",
      tag_flags: { gaClientId: true, utmSource: true, extra: true },
      error_message: sentinel,
    })]);
    expect(output).not.toContain(sentinel);
    expect(output).toContain('"gaClientId"=non-empty');
    expect(output).toContain('"extra"=non-empty');
    expect(output).toContain("skipped_test: false");
    expect(output).toContain("absent CHECKOUT_TAG_NAMES: eula_version, marketingConsent, utmCampaign, utmContent, utmMedium, utmTerm");
  });

  it("distinguishes empty objects, JSON null and malformed tags from a missing path", () => {
    expect(formatFastspringEventTags([fixture({ tags_type: "object", tag_flags: {} })])).toContain("tags: {}");
    expect(formatFastspringEventTags([fixture({ tags_type: "object", tag_flags: null })])).toContain("tags: {}");
    expect(formatFastspringEventTags([fixture({ tags_type: "null" })])).toContain("tags: INVALID (null)");
    const output = formatFastspringEventTags([fixture({
      tags_type: "array", tag_flags: null, live: "SECRET-VALUE-DO-NOT-PRINT",
    })]);
    expect(output).toContain("tags: INVALID (array)");
    expect(output).toContain("live: INVALID");
    expect(output).not.toContain("SECRET-VALUE-DO-NOT-PRINT");
  });
});

describe("read-fastspring-event-tags limit", () => {
  it("defaults to 5 and accepts the boundaries", () => {
    expect(parseLimit([])).toBe(5);
    expect(parseLimit(["1"])).toBe(1);
    expect(parseLimit(["50"])).toBe(50);
  });

  it.each([["0"], ["51"], ["-1"], ["1.5"], ["5x"], ["abc"], [""], ["1", "2"]])("rejects invalid arguments %j", (...args) => {
    expect(() => parseLimit(args)).toThrow("Expected N from 1 to 50");
  });
});

describe("read-fastspring-event-tags errors", () => {
  it.each(["28P01", "42P01", "ECONNREFUSED", "ENOTFOUND"])("reports only name and code %s", (code) => {
    const sentinel = "postgresql://SECRET-USER:SECRET-PASSWORD@SECRET-HOST/SECRET-DB";
    const error = Object.assign(new Error(sentinel), {
      name: "DatabaseError", code, sql: sentinel, parameters: [sentinel], connectionString: sentinel,
    });
    expect(summarizeError(error)).toBe(
      `FAILED — no data was read; no report produced; name=DatabaseError; code=${code}`,
    );
    expect(summarizeError(error)).not.toContain(sentinel);
  });

  it("omits absent or unsafe diagnostic fields", () => {
    const base = "FAILED — no data was read; no report produced";
    expect(summarizeError(undefined)).toBe(base);
    expect(summarizeError(null)).toBe(base);
    expect(summarizeError("secret")).toBe(base);
    expect(summarizeError({ name: "postgresql://secret", code: "ENOTFOUND\nsecret" })).toBe(base);
    expect(summarizeError(new Error("secret"))).toBe(`${base}; name=Error`);
  });

  it("keeps a fixed range hint for limit validation", () => {
    try {
      parseLimit(["abc"]);
      expect.fail("Expected invalid limit to throw");
    } catch (error) {
      expect(summarizeError(error)).toBe(
        "FAILED — no data was read; no report produced; name=LimitValidationError; expected N: 1–50",
      );
    }
  });
});

describe("read-fastspring-event-tags entry guard", () => {
  const repoRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));

  it("treats missing or unresolvable argv paths as not the entry", () => {
    expect(isEntryPoint(undefined)).toBe(false);
    expect(isEntryPoint("\0")).toBe(false);
  });

  it.each(["real", "symlink"] as const)("runs main via an absolute %s path outside the repo before any DB import", (kind) => {
    const tempDir = mkdtempSync(join(tmpdir(), "fastspring-event-tags-"));
    try {
      const scriptsDir = join(repoRoot, "scripts");
      const linkedScripts = join(tempDir, "linked-scripts");
      symlinkSync(scriptsDir, linkedScripts, "dir");
      const script = join(kind === "symlink" ? linkedScripts : scriptsDir, "read-fastspring-event-tags.ts");
      // Always invalid: main must fail before its lazy DB/env imports, even in a configured checkout.
      // Outside the repo, explicitly supply its tsconfig for the checkout module's @/ imports.
      const result = spawnSync(join(repoRoot, "node_modules/.bin/tsx"), [
        "--tsconfig", join(repoRoot, "tsconfig.json"), script, "abc",
      ], {
        cwd: tempDir,
        encoding: "utf8",
        timeout: 10_000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("no data was read");
      expect(result.stderr).toContain("name=LimitValidationError");
      expect(result.stderr).toContain("expected N: 1–50");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
