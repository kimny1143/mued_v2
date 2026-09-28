"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EULA_VERSION } from "@/lib/legal/eula";
import { MASTERCHAIN_TRIAL_DAYS, MASTERCHAIN_TRIAL_LIVE } from "@/lib/masterchain/config";
import { TrialKey } from "./trial-key";

const errors = {
  already_purchased: 409, trial_used: 409, disposable_email: 422,
  rate_limited: 429, eula_required: 400,
} as const;
type TrialError = keyof typeof errors | "generic";

export function MasterchainTrialForm({ locale, firstTouch, downloadUrl }: {
  locale: string;
  firstTouch: Record<string, string | undefined>;
  downloadUrl: string;
}) {
  const t = useTranslations("muedsp.trial");
  const [eulaAccepted, setEulaAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<TrialError | null>(null);
  const [result, setResult] = useState<{ licenseKey: string; expiresAt: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eulaAccepted || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/masterchain/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        body: JSON.stringify({ eulaAccepted, eulaVersion: EULA_VERSION, marketingOptIn, firstTouch }),
      });
      const data = await response.json();
      if (response.status === 200 && typeof data.licenseKey === "string" &&
          typeof data.expiresAt === "string" && Number.isFinite(Date.parse(data.expiresAt))) {
        setResult({ licenseKey: data.licenseKey, expiresAt: data.expiresAt });
      } else {
        const code = data.error as keyof typeof errors;
        setError(Object.hasOwn(errors, code) && errors[code] === response.status ? code : "generic");
      }
    } catch {
      setError("generic");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (!MASTERCHAIN_TRIAL_LIVE) return null;
  if (result) return (
    <section aria-label={t("success")} aria-live="polite">
      <h2 className="text-xl font-semibold">{t("success")}</h2>
      <TrialKey licenseKey={result.licenseKey} label={t("keyLabel")} copyLabel={t("copy")} copiedLabel={t("copied")} failedLabel={t("copyFailed")} />
      <p className="mt-4 font-mono text-sm">{t("ends", { date: new Date(result.expiresAt).toISOString().slice(0, 10) })}</p>
      <a href={downloadUrl} download className="mt-5 inline-flex rounded bg-[#f5a524] px-5 py-3 font-semibold text-black">{t("download")}</a>
      <p className="mt-4 text-sm text-white/75">{t("emailed")} <Link href="/dashboard/plugins" className="text-[#f5a524] underline">{t("portal")}</Link></p>
    </section>
  );
  return (
    <form onSubmit={submit} className="space-y-5" aria-busy={pending}>
      <label className="flex items-start gap-2 text-sm leading-relaxed text-white/75">
        <input type="checkbox" required checked={eulaAccepted} onChange={(event) => setEulaAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#f5a524]" />
        <span>{t("consentPrefix")}{" "}<Link href={`/${locale}/eula`} className="text-[#f5a524] underline decoration-[#f5a524]/40 underline-offset-2">{t("eulaLabel")}</Link></span>
      </label>
      <label className="flex items-start gap-2 text-sm leading-relaxed text-white/75">
        <input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#f5a524]" />
        <span>{t("newsletter")}</span>
      </label>
      <button type="submit" disabled={!eulaAccepted || pending} className="rounded bg-[#f5a524] px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">
        {pending ? t("submitting") : t("start", { days: MASTERCHAIN_TRIAL_DAYS })}
      </button>
      {error && <p role="alert" className="text-sm text-white/80">{t(`errors.${error}`)}{error === "already_purchased" && <> <Link href="/dashboard/plugins" className="text-[#f5a524] underline">{t("portal")}</Link></>}</p>}
    </form>
  );
}
