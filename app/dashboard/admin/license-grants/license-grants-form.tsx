"use client";

import { useState } from "react";

interface GrantRecord {
  id: string;
  email: string;
  productId: string;
  orderRef: string;
  issuedAt: string;
  expiresAt: string;
  reason: string;
  grantedBy: string;
}

const utc = (iso: string) => `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC`;
const field = "w-full rounded border border-white/15 bg-black/40 px-3 py-2 text-sm text-white";
const label = "mb-1 block text-xs text-white/60";

/** What the operator picks from — the first is the default (MUEDvox: conductor 2026-10-15). */
export type GrantProductChoice = { key: string; label: string };

/** Operator screen (kimny only): issue a time-limited key to an address, and see what that address has. */
export function LicenseGrantsForm({ maxDays, products }: { maxDays: number; products: readonly GrantProductChoice[] }) {
  const [email, setEmail] = useState("");
  const [product, setProduct] = useState(products[0]?.key ?? "");
  const [unit, setUnit] = useState<"days" | "minutes">("days");
  const [amount, setAmount] = useState("14");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [records, setRecords] = useState<GrantRecord[] | null>(null);

  async function load(address: string) {
    const res = await fetch(`/api/admin/license/grants?email=${encodeURIComponent(address)}`, { cache: "no-store" });
    if (!res.ok) { setRecords(null); setMessage({ kind: "error", text: `記録を読めませんでした（${res.status}）` }); return; }
    setRecords((await res.json()).grants as GrantRecord[]);
  }

  async function issue(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/license/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, product, [unit]: Number(amount), reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage({ kind: "error", text: `出せませんでした: ${body.error ?? res.status}` }); return; }
      // ★The plug-in shows no expiry (dsp 2026-10-15: "LICENSED" only), so the date must reach the person by mail.
      setMessage({ kind: "ok", text: `出しました。期限 ${utc(body.grant.expiresAt)}。鍵は ${body.grant.email} のポータルに出ます。期限は画面に出ません。期限の日を本人にメールで伝えてください。` });
      await load(body.grant.email);
    } catch {
      setMessage({ kind: "error", text: "出せませんでした（通信）" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-white">
      <h1 className="text-xl font-semibold">期限つきのライセンス（テスター向け）</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        期限つきの鍵を 1 本出します。鍵はメールでは送られません。受け取る人が、下のメールアドレスで mued.jp にサインインすると、ポータルに出ます。
        延長は、同じアドレスにもう 1 本出します。出した鍵は取り消せません（期限で切れます）。
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/60" data-testid="grant-expiry-note">
        プラグインの画面は期限の間も「LICENSED」としか出ず、残りの日数も出ません。期限の日は、鍵を出した時と延長の時のメールで本人に伝えてください。
        鍵を貼れるのは体験版の状態の時だけなので、延長の鍵は、最初の鍵が切れて DEMO に戻ってから貼ってもらいます。
      </p>

      <form onSubmit={issue} className="mt-6 space-y-4" data-testid="grant-form">
        <div>
          <label className={label} htmlFor="grant-product">製品</label>
          <select id="grant-product" value={product} onChange={(e) => setProduct(e.target.value)} className={field}>
            {products.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="grant-email">メールアドレス（相手が返信をくれたアドレスそのもの）</label>
          <input id="grant-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} autoComplete="off" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={label} htmlFor="grant-amount">期間（最長 {maxDays} 日）</label>
            <input id="grant-amount" type="number" min={1} step={1} required value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="grant-unit">単位</label>
            <select id="grant-unit" value={unit} onChange={(e) => setUnit(e.target.value as "days" | "minutes")} className={field}>
              <option value="days">日</option>
              <option value="minutes">分（確かめ用）</option>
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="grant-reason">理由（誰に・なぜ）</label>
          <input id="grant-reason" type="text" required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={field} />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="rounded bg-[#f5a524] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
            {busy ? "出しています…" : "鍵を出す"}
          </button>
          <button type="button" disabled={busy || !email} onClick={() => { setMessage(null); void load(email); }} className="rounded border border-white/20 px-4 py-2 text-sm disabled:opacity-50">
            このアドレスの記録を見る
          </button>
        </div>
      </form>

      {message && (
        <p role="status" data-testid="grant-message" className={`mt-4 text-sm ${message.kind === "ok" ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>
      )}

      {records && (
        <section className="mt-8" data-testid="grant-records">
          <h2 className="text-sm font-semibold text-white/80">記録（{records.length} 本）</h2>
          {records.length === 0 ? <p className="mt-2 text-sm text-white/50">このアドレスに出した鍵は在りません。</p> : (
            <ul className="mt-3 space-y-3">
              {records.map((r) => (
                <li key={r.id} className="rounded border border-white/10 p-3 text-sm">
                  <div className="font-mono text-xs text-white/50">{r.orderRef}</div>
                  <div className="mt-1">{r.productId} — 期限 {utc(r.expiresAt)}{new Date(r.expiresAt).getTime() <= Date.now() ? "（切れた）" : ""}</div>
                  <div className="text-white/60">出した日時 {utc(r.issuedAt)}・理由: {r.reason}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
