import { describe, expect, it } from "vitest";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

// kimny 2026-10-04: #1166 reverted to form notice + news and unsubscribe in every mail.
const NOTICE = {
  ja: "ダウンロードリンクの送付と、MUEDsp のお知らせにメールアドレスを使用します。配信はいつでも解除できます。",
  en: "We'll use your email to send the download link and news from MUEDsp. Unsubscribe anytime.",
} as const;
const FREQUENCY = /occasional|now and then|a few times|monthly|weekly|年に|月に|ときどき|たまに/i;

describe.each([["ja", ja], ["en", en]] as const)("%s email notice wording", (locale, messages) => {
  const notices = [
    { name: "muedsat", namespace: messages.muedsat.form, text: messages.muedsat.form.note },
    { name: "muedlim", namespace: messages.muedlim.form, text: messages.muedlim.form.note },
    { name: "muedrive", namespace: messages.muedrive.form, text: messages.muedrive.form.note },
    { name: "masterchain demo", namespace: messages.muedsp.demo, text: messages.muedsp.demo.emailNotice },
  ];
  it.each(notices)("$name: exact approved notice, both uses and unsubscribe, no consent key or frequency", ({ namespace, text }) => {
    expect(text).toBe(NOTICE[locale]);
    expect(namespace).not.toHaveProperty("consent");
    expect(text).toContain(locale === "ja" ? "ダウンロードリンクの送付" : "send the download link");
    expect(text).toContain(locale === "ja" ? "MUEDsp のお知らせ" : "news from MUEDsp");
    expect(text).toContain(locale === "ja" ? "配信はいつでも解除できます" : "Unsubscribe anytime");
    expect(text).not.toMatch(FREQUENCY);
    expect(text).not.toMatch(/plug-in/i);
  });
});
