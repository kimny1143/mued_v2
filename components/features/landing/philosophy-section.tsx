"use client";

import { Clock, MessageCircle, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Philosophy Section - Landing Page
 *
 * Hoo-centric feature explanation
 * Soft, companion-like tone instead of productivity tool
 */
export function PhilosophySection() {
  return (
    <section className="py-32 bg-[#0F0F1A]/85 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        {/* Intro - softer tone */}
        <div className="max-w-3xl mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
            Hooができること
          </h2>

          <div className="text-lg md:text-xl text-slate-400 leading-relaxed space-y-6">
            <p>
              制作に集中してると、時間を忘れちゃうよね。
              <br />
              Hooがそばにいるから、大丈夫。
            </p>

            <p className="text-white/90">
              気づいたら、あなたの制作をいちばん知ってる存在になってるかも。
            </p>
          </div>
        </div>

        {/* Three features - Hoo as subject */}
        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">休憩を教えてくれる</h3>
            </div>
            <p className="text-slate-400">
              集中しすぎる前に、Hooが「そろそろ休憩しよ？」って教えてくれる。
              頭がスッキリした状態をキープ。
            </p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">話しかけると覚えてる</h3>
            </div>
            <p className="text-slate-400">
              「このEQにした理由は...」って話しかけるだけ。
              Hooが聞いて、ちゃんと覚えておいてくれる。
            </p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">あなたのパターンを知っていく</h3>
            </div>
            <p className="text-slate-400">
              使ってるうちに、Hooはあなたの制作スタイルを学んでいく。
              いつの間にか、一番の理解者に。
            </p>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
