"use client";

import { Headphones } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";

export function MuedearPlaceholder() {
  const { t } = useLocale();
  const p = t.muednote.muedearPlaceholder;

  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
        <Headphones className="w-8 h-8 text-amber-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-3">{p.title}</h2>
      <p className="text-white/60 mb-4 max-w-sm mx-auto">{p.tagline}</p>
      <span className="inline-block text-xs text-amber-400/60 uppercase tracking-widest font-mono mb-8">
        {p.comingSoon}
      </span>
      <div>
        <Link
          href="https://mued.jp#muedear"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium rounded-lg transition-colors border border-amber-500/20 text-sm"
        >
          {p.notify}
        </Link>
      </div>
    </div>
  );
}
