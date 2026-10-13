import { getRequestConfig } from "next-intl/server";
import { locales, type Locale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate that the incoming locale is valid
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    locale = "en";
  }

  // ★MUEDvox's words are in their own files until launch (messages/muedvox.<locale>.json), read HERE only —
  //   on the server. messages/{en,ja}.json are also imported whole by client modules (lib/i18n/locale-context.tsx,
  //   app/layout.tsx), so anything in them ships in a JS chunk on every page (CCO #1268: the unreleased copy was
  //   readable in a production chunk while its page answered 404). lib/muedvox/config.ts clientMessages() then
  //   keeps the namespace out of the HTML as well.
  const [main, muedvox] = await Promise.all([
    import(`../../messages/${locale}.json`),
    locale === "ja" ? import("../../messages/muedvox.ja.json") : import("../../messages/muedvox.en.json"),
  ]);
  return {
    locale,
    messages: { ...main.default, muedvox: muedvox.default },
  };
});
