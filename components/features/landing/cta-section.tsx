"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * CTA Section - Landing Page
 *
 * Psychological effects applied:
 * - Loss aversion: Emphasize what's lost without action
 * - Peak-end rule: End with impactful message
 */
export function CtaSection() {
  return (
    <section className="py-32 bg-[#0F0F1A]/55 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            正解を信じなくていい。
            <br />
            反応を記録しよう。
          </h2>

          <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
            違和感も、納得感も。
            <br />
            どちらもあなたの判断の痕跡です。
          </p>

          <Link
            href="/sign-up"
            className="group inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-lg text-lg font-medium transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 hover:scale-[1.02]"
          >
            判断を残す
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
