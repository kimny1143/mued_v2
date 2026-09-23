import { describe, expect, it, vi } from "vitest";
import { CHECKOUT_TAG_NAMES } from "@/lib/masterchain/fastspring-checkout";
import {
  formatFastspringEventTags,
  parseLimit,
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
  error_message: SKIPPED_TEST_MARKER,
  created_at: "2026-09-23 12:00:00",
  live: false,
  tags_type: null,
  tags: null,
  ...overrides,
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
      tags: { gaClientId: "", eula_version: null, marketingConsent: false, utmSource: "fixture", extra: 0 },
    })]);
    expect(output).toContain('tags: "eula_version"=empty, "extra"=non-empty, "gaClientId"=empty, "marketingConsent"=non-empty, "utmSource"=non-empty');
    expect(output).toContain("absent CHECKOUT_TAG_NAMES: utmCampaign, utmContent, utmMedium, utmTerm");
  });

  it("never prints tag VALUES (including nested values) or raw error messages", () => {
    const sentinel = "SECRET-VALUE-DO-NOT-PRINT";
    const output = formatFastspringEventTags([fixture({
      tags_type: "object",
      tags: { gaClientId: sentinel, utmSource: sentinel, extra: { nested: sentinel } },
      error_message: sentinel,
    })]);
    expect(output).not.toContain(sentinel);
    expect(output).toContain('"gaClientId"=non-empty');
    expect(output).toContain('"extra"=non-empty');
    expect(output).toContain("skipped_test: false");
    expect(output).toContain("absent CHECKOUT_TAG_NAMES: eula_version, marketingConsent, utmCampaign, utmContent, utmMedium, utmTerm");
  });

  it("distinguishes empty objects, JSON null and malformed tags from a missing path", () => {
    expect(formatFastspringEventTags([fixture({ tags_type: "object", tags: {} })])).toContain("tags: {}");
    expect(formatFastspringEventTags([fixture({ tags_type: "null" })])).toContain("tags: INVALID (null)");
    const output = formatFastspringEventTags([fixture({
      tags_type: "array", tags: ["SECRET-VALUE-DO-NOT-PRINT"], live: "SECRET-VALUE-DO-NOT-PRINT",
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

  it.each([["0"], ["51"], ["-1"], ["1.5"], ["5x"], [""], ["1", "2"]])("rejects invalid arguments %j", (...args) => {
    expect(() => parseLimit(args)).toThrow("Expected N from 1 to 50");
  });
});
