"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { trackEvent } from "@/lib/analytics/gtag";

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
}

/**
 * Booking widget for the free 60-min 壁打ち. Opened by AdvisoryPrimaryCta. Fetches open slots
 * (GET /api/advisory/slots), collects name/email + the REQUIRED recording consent, and submits to
 * POST /api/advisory/booking. The consent body is content課 copy rendered via next-intl rich text.
 *
 * NO-SLOTS FALLBACK: when there is no open availability the booking form cannot render, so instead of
 * dead-ending on "no slots" (and losing the lead entirely — this modal is the LP's only intake) we
 * capture the visitor's email + biggest time-sink as an inquiry (POST /api/advisory/inquiry,
 * product='wallhit', source='lp-no-slots') so the operator can follow up when a slot opens.
 */
export function AdvisoryBookingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("advisory.booking");
  const tc = useTranslations("advisory.consent");
  const locale = useLocale();

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [painPoint, setPainPoint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // which flow succeeded — drives the success panel copy (booking vs no-slots inquiry).
  const [done, setDone] = useState<null | "booking" | "inquiry">(null);

  useEffect(() => {
    if (!open) return;
    setSlots(null);
    setSlotId("");
    setError(null);
    setDone(null);
    setConsent(false);
    let cancelled = false;
    fetch("/api/advisory/slots")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSlots(d?.data?.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const formatSlot = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
        timeZone: "Asia/Tokyo",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso)),
    [locale],
  );

  // Pre-consult required question (kimny-approved). content課 owns the canonical copy in messages/*.json
  // (advisory.booking.painPointLabel / painPointHint); until they land it, fall back to the approved
  // text via t.has() so the live modal is never broken or shows a raw key path.
  const painPointLabel = t.has("painPointLabel")
    ? t("painPointLabel")
    : locale === "ja"
      ? "いま一番手間を食っている仕事はなんですか？"
      : "What's eating up the most of your time right now?";
  const painPointHint = t.has("painPointHint")
    ? t("painPointHint")
    : locale === "ja"
      ? "一言でOK"
      : "One line is fine.";
  // No-slots fallback copy (t.has() guarded — content課 canonicalizes advisory.booking.noSlots* later).
  const noSlotsInviteBody = t.has("noSlotsInviteBody")
    ? t("noSlotsInviteBody")
    : locale === "ja"
      ? "いまは空き枠がありません。メールアドレスと、いま一番手間を食っている仕事を教えていただければ、枠が空き次第こちらからご連絡します。"
      : "No open slots right now. Leave your email and your biggest time-sink, and I'll reach out the moment one opens up.";
  const noSlotsInviteSubmit = t.has("noSlotsInviteSubmit")
    ? t("noSlotsInviteSubmit")
    : locale === "ja"
      ? "枠が空いたら知らせてもらう"
      : "Notify me when a slot opens";
  const noSlotsSuccessTitle = t.has("noSlotsSuccessTitle")
    ? t("noSlotsSuccessTitle")
    : locale === "ja"
      ? "受け付けました"
      : "Got it";
  const noSlotsSuccessBody = t.has("noSlotsSuccessBody")
    ? t("noSlotsSuccessBody")
    : locale === "ja"
      ? "枠が空き次第、いただいたメールアドレスにご連絡します。"
      : "I'll email you as soon as a slot opens up.";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slotId || !email || !consent || !painPoint.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    trackEvent({ action: "advisory_booking_submitted", params: { locale } });
    try {
      const res = await fetch("/api/advisory/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, name: name || undefined, email, painPoint: painPoint.trim(), locale, recordingConsent: true, source: "lp" }),
      });
      if (res.ok) {
        setDone("booking");
        trackEvent({ action: "advisory_booking_success", params: { locale } });
        return;
      }
      const d = await res.json().catch(() => null);
      const taken = typeof d?.error === "string" && /taken/i.test(d.error);
      if (taken) {
        setError(t("errorSlotTaken"));
        // the slot is gone — refresh availability so the user can re-pick
        setSlots(null);
        setSlotId("");
        fetch("/api/advisory/slots")
          .then((r) => r.json())
          .then((r) => setSlots(r?.data?.slots ?? []))
          .catch(() => setSlots([]));
      } else {
        setError(t("errorGeneric"));
      }
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  // No-slots lead capture — routes to the inquiry lane (human follow-up, no booking, no recording).
  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !consent || !painPoint.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    trackEvent({ action: "advisory_noslots_inquiry_submitted", params: { locale } });
    try {
      const res = await fetch("/api/advisory/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          painPoint: painPoint.trim(),
          product: "wallhit",
          locale,
          consent: true,
          source: "lp-no-slots",
        }),
      });
      if (res.ok) {
        setDone("inquiry");
        trackEvent({ action: "advisory_noslots_inquiry_success", params: { locale } });
        return;
      }
      setError(t("errorGeneric"));
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const nameInput = (
    <input
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder={t("name")}
      maxLength={100}
      className="min-h-[44px] w-full rounded-lg border border-white/10 bg-[var(--brand-paper)]/5 px-3 text-white placeholder-white/30"
    />
  );
  const emailInput = (
    <input
      type="email"
      required
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder={t("email")}
      className="min-h-[44px] w-full rounded-lg border border-white/10 bg-[var(--brand-paper)]/5 px-3 text-white placeholder-white/30"
    />
  );
  const painPointInput = (
    <div>
      <label htmlFor="advisory-painpoint" className="mb-2 block text-sm text-white/70">
        {painPointLabel}
      </label>
      <textarea
        id="advisory-painpoint"
        required
        value={painPoint}
        onChange={(e) => setPainPoint(e.target.value)}
        placeholder={painPointHint}
        maxLength={1000}
        rows={2}
        className="w-full resize-none rounded-lg border border-white/10 bg-[var(--brand-paper)]/5 px-3 py-2 text-sm text-white placeholder-white/30"
      />
    </div>
  );
  const consentBox = (consentKey: "booking" | "inquiry") => (
    <label className="flex items-start gap-2 text-xs text-white/70">
      <input
        type="checkbox"
        required
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
        className="mt-1 accent-amber-500"
      />
      <span>
        <span className="mb-1 block font-semibold">{tc(`${consentKey}.label`)}</span>
        {tc.rich(`${consentKey}.body`, {
          privacy: (chunks) => (
            <a href={`/${locale}/privacy`} className="underline" target="_blank" rel="noopener noreferrer">
              {chunks}
            </a>
          ),
        })}
      </span>
    </label>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--bg-surface)] p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-white">{t("title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="text-2xl leading-none text-white/50 hover:text-white"
          >
            &times;
          </button>
        </div>

        {done ? (
          <div>
            <p className="mb-2 font-semibold text-white">{done === "booking" ? t("successTitle") : noSlotsSuccessTitle}</p>
            <p className="text-sm text-white/70">{done === "booking" ? t("successBody") : noSlotsSuccessBody}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 min-h-[44px] w-full rounded-xl bg-amber-500 font-bold text-black hover:bg-amber-400"
            >
              {t("close")}
            </button>
          </div>
        ) : slots === null ? (
          <p className="text-sm text-white/40">…</p>
        ) : slots.length === 0 ? (
          // No open slots — capture the lead instead of dead-ending.
          <form onSubmit={submitInquiry} className="space-y-4">
            <p className="text-sm text-white/70">{noSlotsInviteBody}</p>
            {nameInput}
            {emailInput}
            {painPointInput}
            {consentBox("inquiry")}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !email || !consent || !painPoint.trim()}
              className="min-h-[44px] w-full rounded-xl bg-amber-500 font-bold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-amber-500"
            >
              {submitting ? t("submitting") : noSlotsInviteSubmit}
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/70">{t("pickSlot")}</label>
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {slots.map((s) => (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                      slotId === s.id ? "border-amber-500 bg-amber-500/10" : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="advisory-slot"
                      value={s.id}
                      checked={slotId === s.id}
                      onChange={() => setSlotId(s.id)}
                      className="accent-amber-500"
                    />
                    <span className="text-sm text-white">{formatSlot(s.startTime)}</span>
                  </label>
                ))}
              </div>
            </div>

            {nameInput}
            {emailInput}
            {painPointInput}
            {consentBox("booking")}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !slotId || !email || !consent || !painPoint.trim()}
              className="min-h-[44px] w-full rounded-xl bg-amber-500 font-bold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-amber-500"
            >
              {submitting ? t("submitting") : t("submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
