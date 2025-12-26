"use client";

import { Brain, Sparkles, Target } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Philosophy Section - Landing Page
 *
 * Psychological effects applied:
 * - Cognitive dissonance resolution: Addresses AI anxiety, clarifies human role
 * - Aesthetic-usability effect: Dark mode + glassmorphism
 */
export function PhilosophySection() {
  return (
    <section className="py-32 bg-[#0F0F1A]/85 backdrop-blur-md relative">
      <div className="container mx-auto px-6">
        {/* Problem statement - left aligned */}
        <div className="max-w-3xl mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
            プロの"選び方"は、
            <br />
            完成作品には残らない。
          </h2>

          <div className="text-lg md:text-xl text-slate-400 leading-relaxed space-y-6">
            <p>
              なぜそのEQにしたのか。なぜそのテイクを採用したのか。
              <br />
              判断の理由は、作業が終わると消えていく。
            </p>

            <p className="text-white/90">
              <span className="text-indigo-400 font-medium">
                休憩で頭を戻す。思考は声で残る。自動で文字になって貯まる。
              </span>
              <br />
              あなたの"選び方"が、見返せる資産になる。
            </p>
          </div>
        </div>

        {/* Three features - how it works */}
        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">休憩タイマー</h3>
            </div>
            <p className="text-slate-400">
              集中しすぎて判断力が落ちる前に。
              適切なタイミングで休憩を促し、頭をリセット。
            </p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">声で記録</h3>
            </div>
            <p className="text-slate-400">
              「このEQにした理由は...」
              思考を声に出すだけ。手を止めずに判断を残せる。
            </p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">自動で文字化</h3>
            </div>
            <p className="text-slate-400">
              録音した声はWhisperで自動文字起こし。
              検索できる判断ログとして蓄積される。
            </p>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
