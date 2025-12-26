"use client";

import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";

/**
 * CTA Section - Landing Page
 *
 * Psychological effects applied:
 * - Loss aversion: Emphasize what's lost without action
 * - Peak-end rule: End with impactful message
 * - Urgency: 1/7 launch date
 */
export function CtaSection() {
  return (
    <section className="py-32 bg-[#0F0F1A]/55 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* Launch announcement badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 rounded-full text-indigo-400 text-sm font-medium mb-8">
            <Bell className="w-4 h-4" />
            2025年1月7日 リリース予定
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            今日の判断が、
            <br />
            明日の自分を助ける。
          </h2>

          <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
            「なぜそうしたか」は、作業が終わると消えていく。
            <br />
            MUEDnoteで、あなたの選び方を資産にしよう。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="group inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-lg text-lg font-medium transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 hover:scale-[1.02]"
            >
              リリースを待つ
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
