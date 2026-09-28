/**
 * Guard — the Terms and 特商法 must describe how keys are actually delivered (kimny 2026-09-28: keys are
 * never emailed; they are obtained in the signed-in mued.jp portal). The contract-formation line is
 * legal substance, so a template or portal change that drifts from it has to fail here.
 */
import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

describe.each([["en", en], ["ja", ja]] as const)("legal delivery wording (%s)", (_locale, messages) => {
  const deliveryCopy = [
    messages.terms.accounts.body,
    messages.terms.license.body,
    messages.tokushoho.contractEstablishment.value,
    messages.tokushoho.muedsp.delivery.value,
  ];

  it("names the portal as where the key is obtained", () => {
    for (const copy of deliveryCopy) expect(copy).toMatch(/portal|ポータル/);
  });

  it("never claims the key itself is sent by email", () => {
    for (const copy of deliveryCopy) {
      expect(copy).not.toMatch(
        /download link and license key are sent|email containing your license key|downloads and license keys are delivered|ライセンスキーを記載したメール|ダウンロードリンクとライセンスキーを(、|直ちに|通常)|ダウンロードリンクおよびライセンスキーはご登録/,
      );
    }
  });
});
