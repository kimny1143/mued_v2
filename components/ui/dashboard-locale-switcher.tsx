"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { type Locale } from "@/lib/i18n/config";

const localeNames: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
};

/**
 * Dashboard Locale Switcher - Button Toggle
 *
 * Uses Context/localStorage to switch languages without URL change
 * For authenticated dashboard pages where SEO doesn't matter
 */
export function DashboardLocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  const locales: Locale[] = ["ja", "en"];

  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            locale === l
              ? "bg-white/10 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          {localeNames[l]}
        </button>
      ))}
    </div>
  );
}
