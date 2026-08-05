/**
 * Unit — 特商法ページ: 訳文の改行が描画で潰れないこと。
 *
 * ★測るのは「class が書いてあるか」ではなく「改行を含む値の描画先に class が在るか」。
 * i18n 側に改行が増えても、描画先が別の prop に変わっても、この対応関係で捕まる。
 *
 * 背景 (2026-08-05 実測): 本番 `https://mued.jp/ja/tokushoho` の HTML には
 * `muedial.paymentTiming.value` の実改行が 2 個 入っていたが、描画先の
 * `<p class="text-slate-300 text-sm">` に `whitespace-pre-line` が無く、CSS 既定の
 * `white-space: normal` が改行を潰していた —— ★法定表記が1つの塊で出ていた。
 * 「都度購入」と「Hoo Pass (新規受付停止)」の段が視覚的に分かれていなかった。
 *
 * ★母集団を包含リストで書かない: 「改行を含む値」を messages から機械的に集める。
 * 手書きの配列は、値が増えた日に腐る。
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const PAGE = join(ROOT, "app", "[locale]", "tokushoho", "page.tsx");
const LOCALES = ["ja", "en"] as const;

/** tokushoho namespace の中で、値に改行を含むものの key を集める (再帰) */
function newlineKeys(locale: string): string[] {
  const msgs = JSON.parse(readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8"));
  const out: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (typeof node === "string") {
      if (node.includes("\n")) out.push(path);
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(msgs.tokushoho, "");
  return out;
}

const source = readFileSync(PAGE, "utf8");

/** `propName={t("some.key")}` → prop 名 → i18n key の対応 */
function propForKey(key: string): string[] {
  const re = new RegExp(String.raw`(\w+)=\{t\("${key.replace(/\./g, "\\.")}"\)\}`, "g");
  return [...source.matchAll(re)].map((m) => m[1]);
}

/** `<tag className="...">{prop}</tag>` → その prop を描画している要素の className */
function classNamesRendering(prop: string): string[] {
  const re = new RegExp(String.raw`className="([^"]*)"[^>]*>\{${prop}\}<`, "g");
  return [...source.matchAll(re)].map((m) => m[1]);
}

describe("特商法ページ — 改行を含む訳文は whitespace-pre-line で描画される", () => {
  it.each(LOCALES)("%s: 母集団が空でない（★検査が成立していること）", (locale) => {
    // ★これが無いと、walk が壊れた日に「対象 0 件 → 全部 pass」で緑になる。
    expect(newlineKeys(locale).length).toBeGreaterThan(0);
  });

  it("★改行を含む値の描画先すべてに whitespace-pre-line が在る", () => {
    // ja / en どちらかに改行が在れば対象 (片方だけ段落分けされている場合も守る)
    const keys = [...new Set(LOCALES.flatMap((l) => newlineKeys(l)))];
    const failures: string[] = [];

    for (const key of keys) {
      const props = propForKey(key);
      // ★key が page.tsx から参照されていない = 描画されていない。それ自体を報告する
      // (「class が無い」ではなく「対応が取れない」は別の異常)。
      if (props.length === 0) {
        failures.push(`${key}: page.tsx から参照されていない (t("${key}") が無い)`);
        continue;
      }
      for (const prop of props) {
        const classes = classNamesRendering(prop);
        if (classes.length === 0) {
          failures.push(`${key} → {${prop}}: 描画要素が見つからない (className 付きで描画されていない)`);
          continue;
        }
        for (const cls of classes) {
          if (!cls.includes("whitespace-pre-line")) {
            failures.push(`${key} → {${prop}}: class="${cls}" に whitespace-pre-line が無い`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("★陰性対照: 改行を含まない値には whitespace-pre-line を要求していない", () => {
    // 「全要素に付けろ」ではないことを固定する。付けすぎも設計判断なので、
    // ★改行の無い値まで巻き込んでいたら この検査が落ちる。
    const withNewline = new Set(LOCALES.flatMap((l) => newlineKeys(l)));
    const plain = propForKey("muedial.delivery.value"); // 改行を含まない実在キー
    expect(withNewline.has("muedial.delivery.value")).toBe(false); // 前提の確認
    expect(plain.length).toBeGreaterThan(0); // ★陽性対照: 対応が取れている
    for (const cls of classNamesRendering(plain[0])) {
      expect(cls).not.toContain("whitespace-pre-line");
    }
  });
});
