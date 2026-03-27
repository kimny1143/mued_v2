"use client";

import { Smartphone, Monitor } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";

/**
 * MUEDnote App Download Tabs
 */
export function MuednoteTabs() {
  const { locale } = useLocale();

  return (
    <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
      <a
        href="https://apps.apple.com/app/muednote/id6757840889"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30"
      >
        <Smartphone className="w-4 h-4" />
        {locale === "ja" ? "iOSアプリ" : "iOS App"}
      </a>
      <a
        href="/downloads/MUEDnoteHub-0.8.1.dmg"
        download
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
      >
        <Monitor className="w-4 h-4" />
        macOS Hub
      </a>
    </div>
  );
}
