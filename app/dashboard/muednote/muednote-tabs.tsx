"use client";

import Link from "next/link";
import { Mic } from "lucide-react";
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
