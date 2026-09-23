import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

describe("customer requirements and support copy", () => {
  it.each([
    ["ja", ja, {
      os: "macOS 11.0 以降",
      mac: "Apple シリコン（M1 以降）または Intel プロセッサの Mac",
      memory: "メモリ 8GB 以上（16GB 以上推奨）",
    }, "受付時間: 平日 10:00〜18:00（日本時間）。土日祝・年末年始はお休みです。通常 1〜2 営業日以内にお返事します。"],
    ["en", en, {
      os: "macOS 11.0 or later",
      mac: "Mac with Apple silicon (M1 or later) or an Intel processor",
      memory: "8 GB RAM or more (16 GB recommended)",
    }, "Hours: Weekdays 10:00–18:00 Japan Time (JST), excluding Japanese public holidays and the New Year break. We usually reply within 1–2 business days."],
  ] as const)("%s has the approved requirements and support hours", (_locale, messages, environment, hours) => {
    expect(messages.tokushoho.muedsp.environment).toMatchObject(environment);
    expect(messages.support.contact.hours).toBe(hours);
  });

  it("renders the environment items in order and the contact hours below the email", () => {
    const tokushoho = readFileSync("app/[locale]/tokushoho/page.tsx", "utf8");
    const support = readFileSync("app/[locale]/support/page.tsx", "utf8");
    const keys = [...tokushoho.matchAll(/t\("muedsp\.environment\.(os|mac|memory|formats|host|windows)"\)/g)]
      .map((match) => match[1]);
    expect(keys).toEqual(["os", "mac", "memory", "formats", "host", "windows"]);
    expect(support).toContain('t("contact.hours")');
    expect(support.indexOf('t("contact.hours")')).toBeGreaterThan(support.indexOf("mailto:support@glasswerks.jp"));
  });
});
