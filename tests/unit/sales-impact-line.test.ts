/**
 * G1 (sales-path guard, kimny 2026-10-04): a PR on the customer path must carry one `sales-impact:` line —
 * 増える／変わらない／法の明文: <条文名>. "減る" cannot be written. Enforced by the merge gate (⑥).
 */
import { describe, expect, it } from "vitest";
import { parseSalesImpact, parseCopyApproval } from "../../scripts/ci/sales-impact.mjs";
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

  it("a truncated file list (100) counts as the customer path — nothing hides in the part not seen", () => {
    const hundred = Array.from({ length: 100 }, (_, i) => `docs/f${i}.md`);
    expect(salesImpactVoidReason(hundred, "")).toContain("sales-impact");
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
