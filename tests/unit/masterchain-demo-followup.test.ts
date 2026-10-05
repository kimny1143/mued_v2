import { expect, it, vi } from "vitest";
import { selectDemoFollowup, listResendPages } from "@/lib/masterchain/demo-followup";
import { emailTemplates } from "@/lib/services/email.service";
const click = (email: string, url = "https://mued.jp/en/muedsp#masterchain") => ({ email, clicked_links: [{ url, clicks: 1 }] });
it("deduplicates campaigns and excludes demo recipients, unsubscribes, complaints and unrelated clicks", () => {
  const names = ["ok", "demo", "unsub", "complaint", "missing", "unsubscribe-click", "other", "buyer"];
  const result = selectDemoFollowup({
    clicks: [...names.map(n => click(`${n}@example.com`, n === "unsubscribe-click" ? "https://unsubscribe.resend.com/token" : n === "other" ? "https://mued.jp/en/learn" : undefined)), click(" OK@example.com ")],
    contacts: names.filter(n => n !== "missing").map(n => ({ email: `${n}@example.com`, unsubscribed: n === "unsub" })),
    emails: [{ to: ["demo@example.com"], subject: "Your MUEDsp masterchain demo download", last_event: "sent" }, { to: ["buyer@example.com"], subject: "[MUEDsp] Your masterchain download and how to get your license", last_event: "delivered" }],
    excluded: ["complaint@example.com"],
  });
  expect(result.recipients).toEqual(["ok@example.com"]);
  expect(result.counts.allClicked).toBe(8);
});
it("refuses broken pagination and exhausts valid pages", async () => {
  const get = vi.fn().mockResolvedValueOnce({ data: [{ id: "1" }], has_more: true }).mockResolvedValueOnce({ data: [{ id: "2" }], has_more: false });
  expect(await listResendPages(get, "/emails")).toHaveLength(2);
  expect(get).toHaveBeenLastCalledWith("/emails?limit=100&after=1");
  await expect(listResendPages(async () => ({ data: [], has_more: true }), "/emails")).rejects.toThrow("pagination");
  await expect(listResendPages(async () => ({ data: [] }), "/emails")).rejects.toThrow("Invalid");
});
it.each(["ja", "en"] as const)("renders truthful direct links and a broadcast unsubscribe in %s", locale => {
  const mail = emailTemplates.masterchainDemoFollowup(locale);
  expect(mail.html).toContain(`<html lang="${locale}">`);
  expect(mail.html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  expect(mail.html).toContain("keyentry-2026.10/MUEDsp-masterchain-1.0.1-installer.pkg");
  expect(mail.html).toContain("win-x64-a2678157.zip");
  expect(mail.html).toContain(locale === "ja" ? 'Windows 版デモをダウンロード（VST3）' : 'Download the Windows demo (VST3)');
  expect(mail.html).not.toContain("class=\"header\"");
  expect(mail.text).toContain("45");
  expect(mail.text).toContain(locale === "ja" ? "このメールから直接" : "direct download links in this email");
  expect(mail.text).not.toContain("We've updated our site");
  expect(mail.text).not.toContain("登録不要のダイレクトリンクに変更");
});
