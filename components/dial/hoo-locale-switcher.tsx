"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "@/lib/i18n/locale-context";

type HooLocale = "en" | "ja";

const HOO_LOCALE_KEY = "hooLocale";
const HOO_LOCALE_COOKIE = "HOO_LOCALE";

export function useHooLocale() {
  const { locale: uiLocale } = useLocale();
  const [hooLocale, setHooLocaleState] = useState<HooLocale>(uiLocale as HooLocale);

  useEffect(() => {
    const saved = localStorage.getItem(HOO_LOCALE_KEY) as HooLocale | null;
    if (saved === "en" || saved === "ja") {
      setHooLocaleState(saved);
    } else {
      // First visit: inherit from UI locale
      setHooLocaleState(uiLocale as HooLocale);
    }
  }, [uiLocale]);

  const setHooLocale = useCallback((next: HooLocale) => {
    setHooLocaleState(next);
    localStorage.setItem(HOO_LOCALE_KEY, next);
    document.cookie = `${HOO_LOCALE_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
    window.dispatchEvent(new CustomEvent("hooLocaleChange", { detail: next }));
  }, []);

  return { hooLocale, setHooLocale };
}

export function HooLocaleSwitcher() {
  const { hooLocale, setHooLocale } = useHooLocale();

  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
      <span className="text-xs text-amber-400 px-1 select-none">🦉</span>
      {(["ja", "en"] as HooLocale[]).map((l) => (
        <button
          key={l}
          onClick={() => setHooLocale(l)}
          className={`px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
            hooLocale === l
              ? "bg-amber-500/20 text-amber-300"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          {l === "ja" ? "日本語" : "English"}
        </button>
      ))}
    </div>
  );
}
