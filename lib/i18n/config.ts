/**
 * i18n Configuration
 *
 * Defines supported locales and default locale
 */

export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
};

export function getPreferredLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const languages = acceptLanguage.split(",").map((lang) => {
    const [code, q = "q=1"] = lang.trim().split(";");
    return {
      code: code.split("-")[0].toLowerCase(),
      quality: parseFloat(q.replace("q=", "")) || 1,
    };
  });

  languages.sort((a, b) => b.quality - a.quality);

  for (const lang of languages) {
    if (locales.includes(lang.code as Locale)) {
      return lang.code as Locale;
    }
  }

  return defaultLocale;
}
