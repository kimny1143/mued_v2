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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlots(null);
    setSlotId("");
    setError(null);
    setDone(false);
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slotId || !email || !consent || submitting) return;
    setError(null);
    setSubmitting(true);
    trackEvent({ action: "advisory_booking_submitted", params: { locale } });
    try {
      const res = await fetch("/api/advisory/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, name: name || undefined, email, locale, recordingConsent: true, source: "lp" }),
      });
      if (res.ok) {
        setDone(true);
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

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111113] p-6 max-h-[90vh] overflow-y-auto"
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
            <p className="mb-2 font-semibold text-white">{t("successTitle")}</p>
            <p className="text-sm text-white/70">{t("successBody")}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 min-h-[44px] w-full rounded-xl bg-amber-500 font-bold text-black hover:bg-amber-400"
            >
              {t("close")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/70">{t("pickSlot")}</label>
              {slots === null ? (
                <p className="text-sm text-white/40">…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-white/60">{t("noSlots")}</p>
              ) : (
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
              )}
            </div>

            {slots && slots.length > 0 && (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("name")}
                  maxLength={100}
                  className="min-h-[44px] w-full rounded-lg border border-white/10 bg-white/5 px-3 text-white placeholder-white/30"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("email")}
                  className="min-h-[44px] w-full rounded-lg border border-white/10 bg-white/5 px-3 text-white placeholder-white/30"
                />
                <label className="flex items-start gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 accent-amber-500"
                  />
                  <span>
                    <span className="mb-1 block font-semibold">{tc("booking.label")}</span>
                    {tc.rich("booking.body", {
                      privacy: (chunks) => (
                        <a href={`/${locale}/privacy`} className="underline" target="_blank" rel="noopener noreferrer">
                          {chunks}
                        </a>
                      ),
                    })}
                  </span>
                </label>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting || !slotId || !email || !consent}
                  className="min-h-[44px] w-full rounded-xl bg-amber-500 font-bold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {submitting ? t("submitting") : t("submit")}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
