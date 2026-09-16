// ★署名鍵の identity（公開鍵 hex）を読める1点。★dsp が 2026-07-27 に求めた検査を成立させるための
// 最後の一片で、★`licenseSigningPublicKeyHex()` は同日から在るのに ★呼び出し元が1つも無かった。
//
// ★なぜ公開してよいか: ★返すのは ★公開鍵である。★同じ値が ★配布済プラグインの
// `plugin/MUEDsp/dsp/LicenseVerifier.h` に ★焼き込まれて出荷されている ∴ ★秘密ではない。
// ★秘密鍵（MASTERCHAIN_LICENSE_PRIVATE_KEY）は ★Vercel env から出ず、★この route も触らない。
//
// ★なぜ要るか（dsp・逐語の要旨）: ★「kimny が鍵を登録した」と「最初の本物の注文」の間には
// ★検査が1つも無い ——★鍵は在るが ★それが ★正しい鍵である証明が無い。★この route で
// ★issuer 側の公開鍵 hex を出し、★dsp が binary に焼かれた hex と ★文字列比較すれば、
// ★**実物のライセンスを1本も発行せずに**「正しい鍵で解錠される」の半分が閉じる
// （★残り半分＝keyfile の format は ★tests/fixtures/license-vectors の 15 case が担保）。
//
// ★★実キーを発行して渡す案を採らなかった理由: ★K1 署名のキーは ★bearer credential で、
// ★オフライン検証ゆえ ★発行したら撤回できない。★公開鍵の比較なら ★何も発行せずに済む。
//
// ★`configured: false` は ★秘密鍵が未設定 or Ed25519 でない場合。★Preview では Production 限定の
// ★秘密鍵が無いので ★false を返すのが正しい（★これは欠陥ではない）。
import { NextResponse } from "next/server";
import { licenseSigningPublicKeyHex } from "@/lib/masterchain/license";

export async function GET() {
  const publicKeyHex = licenseSigningPublicKeyHex();
  return NextResponse.json({
    configured: publicKeyHex !== null,
    // ★64 hex 文字（Ed25519 の raw 32 byte）。★これ以外の長さが出たら鍵種が違う
    //   ——★`licenseSigningPublicKeyHex` が Ed25519 以外を拒否して null を返す理由もそこ。
    publicKeyHex,
    compareWith: "plugin/MUEDsp/dsp/LicenseVerifier.h (burned-in verifier key)",
  });
}
