"use client";

import Link from "next/link";
import { Mic, Smartphone, Monitor } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
// TODO: v1.1.0 - DAW Logs feature
// import { Sliders } from "lucide-react";

interface MuednoteTabsProps {
  activeTab: "overview" | "daw";
  dawLogCount: number;
  sessionCount: number;
}

export function MuednoteTabs({
  activeTab,
  // TODO: v1.1.0 - DAW Logs feature
  // dawLogCount,
  sessionCount,
}: MuednoteTabsProps) {
  const { locale } = useLocale();

  return (
    <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
      <Link
        href="/dashboard/muednote"
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          activeTab === "overview"
            ? "bg-white/10 text-white"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <Mic className="w-4 h-4" />
        Overview
        {sessionCount > 0 && (
          <span className="ml-1 text-xs text-slate-500">({sessionCount})</span>
        )}
      </Link>
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
        href="/downloads/MUEDnoteHub-1.0.0.dmg"
        download
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
      >
        <Monitor className="w-4 h-4" />
        {locale === "ja" ? "macOS Hub" : "macOS Hub"}
      </a>
      {/* TODO: v1.1.0 - DAW Logs tab
      <Link
        href="/dashboard/muednote?tab=daw"
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          activeTab === "daw"
            ? "bg-white/10 text-white"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <Sliders className="w-4 h-4" />
        DAW Logs
        {dawLogCount > 0 && (
          <span className="ml-1 text-xs text-slate-500">({dawLogCount})</span>
        )}
      </Link>
      */}
    </div>
  );
}
