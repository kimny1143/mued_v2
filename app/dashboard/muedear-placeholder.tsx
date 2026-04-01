"use client";

import { Music } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";

export function MuedearPlaceholder() {
  const { t } = useLocale();

  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Music className="w-8 h-8 text-indigo-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        {t.muednote.muedearPlaceholder.title}
      </h2>
      <p className="text-white/60 mb-2">
        {t.muednote.muedearPlaceholder.description}
      </p>
      <span className="inline-block text-xs text-white/30 uppercase tracking-wider mb-6">
        {t.muednote.muedearPlaceholder.comingSoon}
      </span>
      <div>
        <Link
          href="/muedear"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-medium rounded-lg transition-colors border border-indigo-500/30"
        >
          <Music className="w-4 h-4" />
          {t.muednote.muedearPlaceholder.openApp}
        </Link>
      </div>
    </div>
  );
}
