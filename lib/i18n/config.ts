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
