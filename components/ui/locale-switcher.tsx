"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";

/**
 * Locale Switcher - Landing Page (Subpath)
 *
 * Switches between /ja and /en by navigating to the new URL
 */
export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const handleLocaleChange = (newLocale: Locale) => {
    // Replace the locale segment in the path
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => handleLocaleChange(l)}
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
