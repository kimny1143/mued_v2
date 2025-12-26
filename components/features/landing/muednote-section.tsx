"use client";

import { Mic, FileText, TrendingUp, Clock } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * MUEDnote Section - Landing Page
 *
 * Introduces MUEDnote iOS app
 * Focus on recording decisions during creative process
 */
export function MuednoteSection() {
  const features = [
    {
      icon: Clock,
      text: "休憩タイマーで集中力をキープ",
    },
    {
      icon: Mic,
      text: "声で判断理由を即座に記録",
    },
    {
      icon: FileText,
      text: "Whisperで自動文字起こし",
    },
    {
      icon: TrendingUp,
      text: "判断ログとしてDBに蓄積",
    },
  ];

  return (
    <section className="py-20 bg-[#1A1A2E]/90 backdrop-blur-lg relative">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Description */}
          <div>
            <div className="inline-block px-3 py-1 bg-indigo-600/20 rounded-full text-indigo-400 text-sm font-medium mb-6">
              iOS App
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              MUEDnote
            </h2>

            <div className="text-lg text-slate-400 leading-relaxed mb-8 space-y-4">
              <p>ミックス中、アレンジ中の「なぜ」を逃さない。</p>
              <p className="text-white/90">
                声で残して、自動で文字になる。
                <br />
                未来の自分が見返せる、判断の記録帳。
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-slate-300">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0F0F1A] px-6 py-3 rounded-lg font-medium hover:bg-slate-100 transition-colors cursor-pointer"
              >
                1/7 リリース予定
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
              >
                iOS App
              </a>
            </div>
          </div>

          {/* Right: App preview placeholder */}
          <div className="flex justify-center lg:justify-end">
            <GlassCard className="w-72 h-[500px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-slate-400 text-sm">App Preview</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
