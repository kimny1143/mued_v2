"use client";

import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { locales, localeNames } from "@/lib/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <nav
      className="brand-language-switcher"
      aria-label={locale === "ja" ? "表示言語" : "Display language"}
    >
      {locales.map((language) => (
        <a
          key={language}
          href={pathname.replace(/^\/(ja|en)(?=\/|$)/, `/${language}`)}
          lang={language}
          hrefLang={language}
          aria-label={localeNames[language]}
          aria-current={locale === language ? "page" : undefined}
        >
          {language.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
