/**
 * G1 (sales-path guard, kimny 2026-10-04): a PR on the customer path must carry one `sales-impact:` line —
 * 増える／変わらない／法の明文: <条文名>. "減る" cannot be written. Enforced by the merge gate (⑥).
 */
import { describe, expect, it } from "vitest";
import { parseSalesImpact, parseCopyApproval, parseGuardChange, touchesGuard, withoutFences } from "../../scripts/ci/sales-impact.mjs";
import { salesImpactVoidReason } from "../../scripts/verify/pr-merge-gate";

describe("parseSalesImpact", () => {
  it.each([
    ["sales-impact: 増える: デモの段が 2.05→1.51 画面", "増える"],
    ["intro\n\nsales-impact: 変わらない: 文言だけ\n\n## 何を", "変わらない"],
    ["sales-impact：変わらない：全角のコロン", "変わらない"],
    ["sales-impact: 法の明文: 特定電子メール法 4 条", "法の明文"],
    ["> sales-impact: 増える: 引用の中", "増える"],
    ["sales-impact: kimny の判断: 「チェック必須はやめる」 2026-10-04", "kimny の判断"],
  ])("accepts %j", (body, kind) => {
    expect(parseSalesImpact(body)).toMatchObject({ ok: true, kind });
  });

  it.each([
    ["", "無い"],
    ["## 何を\n文だけ", "無い"],
    ["sales-impact: 減る: 法のため", "減る"],
    ["sales-impact: 法の明文: —", "条文名"],
    ["sales-impact: 法の明文:", "条文名"],
    ["sales-impact: 増える", "のどれか"],
    ["sales-impact: たぶん増える: 理由", "のどれか"],
    ["sales-impact: 変わらない: ", "理由"],
    ["sales-impact: 増える: a\nsales-impact: 変わらない: b", "2 行"],
    ["sales-impact: kimny の判断: 減るが出す", "日付"],
  ])("rejects %j", (body, why) => {
    const r = parseSalesImpact(body);
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.reason).toContain(why);
  });
});

describe("gate ⑥ salesImpactVoidReason", () => {
  const CUSTOMER = ["components/features/muedsp-landing/masterchain-try.tsx"];
  const OTHER = ["docs/x.md", "status.md"];

  it("off the customer path → no requirement", () => {
    expect(salesImpactVoidReason(OTHER, "")).toBeNull();
  });

  it("on the customer path without the line → VOID", () => {
    expect(salesImpactVoidReason(CUSTOMER, "## 何を\nボタンを直す")).toContain("sales-impact");
  });

  it("on the customer path with a valid line → fine", () => {
    expect(salesImpactVoidReason(CUSTOMER, "sales-impact: 増える: 押せるボタン")).toBeNull();
  });

  it("★this week's case A (#1166, the opt-in box): a grey-area worry cannot be written as 法の明文 → VOID", () => {
    expect(salesImpactVoidReason(["components/features/muedsat-landing/muedsat-signup-form.tsx"], "sales-impact: 法の明文: —")).toContain("条文名");
    expect(salesImpactVoidReason(["components/features/muedsat-landing/muedsat-signup-form.tsx"], "sales-impact: 減る: 同意のため")).toContain("減る");
  });

  it("a truncated file list (100) counts as the customer path AND as a guard change — nothing hides in the part not seen", () => {
    const hundred = Array.from({ length: 100 }, (_, i) => `docs/f${i}.md`);
    expect(salesImpactVoidReason(hundred, "")).toContain("guard-change");
    expect(salesImpactVoidReason(hundred, "guard-change: kimny 2026-10-04 conductor の窓")).toContain("sales-impact");
  });
});

describe("approved-copy provenance (CCO #1223)", () => {
  const COPY = ["docs/copy/approved-ja.json", "messages/ja.json"];
  const OK_IMPACT = "sales-impact: 変わらない: 文言だけ";

  it("a PR that changes the approved copy without copy-approval → VOID", () => {
    expect(salesImpactVoidReason(COPY, OK_IMPACT)).toContain("copy-approval");
  });

  it("with who / date / channel → fine", () => {
    expect(salesImpactVoidReason(COPY, `${OK_IMPACT}\ncopy-approval: kimny 2026-10-04 Chief の窓（逐語）`)).toBeNull();
  });

  it.each(["copy-approval: kimny", "copy-approval: kimny 10/4 Chief", "copy-approval: 2026-10-04 Chief"])("malformed %j → rejected", (line) => {
    expect(parseCopyApproval(line).ok).toBe(false);
  });

  it("a copy change elsewhere on the path (no docs/copy) needs only sales-impact", () => {
    expect(salesImpactVoidReason(["messages/ja.json"], OK_IMPACT)).toBeNull();
  });
});

describe("guard-change provenance (CCO #1227)", () => {
  const IMPACT = "sales-impact: kimny の判断: 「購入とデモを区別」 2026-10-04";
  const GUARD = "guard-change: kimny 2026-10-04 conductor の窓（購入ボタンだけ別の色）";

  it.each([
    "e2e/sales-path/cta.spec.ts",
    "playwright.sales-path.config.ts",
    ".github/workflows/sales-path.yml",
    "scripts/ci/sales-path.mjs",
    "scripts/ci/sales-impact.mjs",
    "scripts/verify/pr-merge-gate.ts",
    "scripts/verify/gate-mutation-check.ts",
    "lib/funnel/denominator-trend.ts",
    "tests/unit/sales-path-trigger.test.ts",
    "tests/unit/sales-path-approved-copy.test.ts",
    "tests/unit/sales-impact-line.test.ts",
    "tests/unit/funnel-denominator-trend.test.ts",
    "lib/funnel/numbers.ts",
    "scripts/emit-funnel-numbers.ts",
    "vitest.config.unit.ts",
    ".github/workflows/test.yml",
  ])("%s is a guard file", (p) => {
    expect(touchesGuard([p])).toBe(true);
  });

  it.each(["components/features/muedsp-landing/masterchain-try.tsx", "tests/unit/other.test.ts", "docs/copy/approved-ja.json", "status.md"])(
    "%s is not a guard file",
    (p) => {
      expect(touchesGuard([p])).toBe(false);
    },
  );

  it("★#1227's shape: the guard and the guarded change in one PR — VOID without guard-change, fine with it", () => {
    const paths = ["components/features/muedsp-landing/masterchain-buy-button.tsx", "e2e/sales-path/cta.spec.ts"];
    expect(salesImpactVoidReason(paths, IMPACT)).toContain("guard-change");
    expect(salesImpactVoidReason(paths, `${IMPACT}\n${GUARD}`)).toBeNull();
  });

  it("★a guard file OFF the customer path still needs guard-change (the unit tests are not on the customer path)", () => {
    expect(salesImpactVoidReason(["tests/unit/sales-impact-line.test.ts"], "")).toContain("guard-change");
    expect(salesImpactVoidReason(["tests/unit/sales-impact-line.test.ts"], GUARD)).toBeNull();
  });

  it.each(["guard-change: kimny", "guard-change: kimny 10/4 conductor", "guard-change: 2026-10-04 conductor", `${GUARD}\n${GUARD}`])("malformed %j → rejected", (body) => {
    expect(parseGuardChange(body).ok).toBe(false);
  });
});

describe("a format example inside a fenced code block is not a declaration (CCO #1229)", () => {
  // ★Positive control: #1229's own body had the example in a ``` block plus the real line → counted 2 → VOID.
  const BODY_1229 = [
    "A PR that edits a guard file now needs one line in its body:",
    "",
    "```",
    "guard-change: <who> <YYYY-MM-DD> <channel>",
    "```",
    "",
    "guard-change: kimny 2026-10-04 この窓（merge の許可）",
  ].join("\n");

  it("#1229's body has exactly one guard-change line", () => {
    expect(parseGuardChange(BODY_1229)).toMatchObject({ ok: true, who: "kimny", date: "2026-10-04" });
  });

  it.each([
    ["sales-impact", "sales-impact: 増える: 例", "sales-impact: 変わらない: 本物", (b: string) => parseSalesImpact(b)],
    ["copy-approval", "copy-approval: <誰> <YYYY-MM-DD> <経路>", "copy-approval: kimny 2026-10-04 Chief の窓", (b: string) => parseCopyApproval(b)],
    ["guard-change", "guard-change: x 2026-01-01 例", "guard-change: kimny 2026-10-04 この窓", (b: string) => parseGuardChange(b)],
  ])("%s: the fenced example is skipped, the real line is read", (_k, example, real, parse) => {
    expect(parse(["~~~", example, "~~~", real].join("\n")).ok).toBe(true);
    expect(parse(["```md", example, "```"].join("\n")).ok).toBe(false); // only an example → no line
  });

  it("an unclosed fence hides everything after it (fails closed: the line is not found → VOID)", () => {
    expect(parseGuardChange("```\nguard-change: kimny 2026-10-04 この窓").ok).toBe(false);
  });

  it("text outside the fences is kept as is", () => {
    expect(withoutFences("a\n```\nb\n```\nc")).toBe("a\nc");
  });
});
